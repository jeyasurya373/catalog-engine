import re
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field
from rapidfuzz import fuzz

app = FastAPI(title="Rubick ML Service", version="1.0.0")

BRANDS = ["nike", "adidas", "puma", "samsung", "sony", "boat", "levis", "lakme", "maybelline", "allen solly"]
COLORS = {
    "black": ["black", "blk", "jet black"],
    "white": ["white", "wht"],
    "blue": ["blue", "navy"],
    "red": ["red", "maroon"],
    "green": ["green", "olive"],
    "beige": ["beige", "cream"],
}
MATERIALS = ["cotton", "denim", "synthetic", "leather", "mesh", "polyester", "matte", "wireless"]
CATEGORY_KEYWORDS = {
    "Footwear": ["shoe", "shoes", "sneaker", "running", "air max"],
    "Electronics": ["phone", "smartphone", "headphone", "earbud", "speaker"],
    "Clothing": ["jeans", "shirt", "tshirt", "trouser"],
    "Beauty": ["lipstick", "makeup", "foundation", "cream"],
}


class TextPayload(BaseModel):
    text: str = Field(min_length=2)


class DedupPayload(BaseModel):
    left: str = Field(min_length=2)
    right: str = Field(min_length=2)


def normalize_text(text: str) -> str:
    text = text.lower()
    text = text.replace("airmax", "air max")
    text = re.sub(r"[^a-z0-9\s.]", " ", text)
    text = re.sub(r"\b(size|men|women|for|with)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_brand(text: str) -> str | None:
    normalized = normalize_text(text)
    for brand in BRANDS:
        if brand in normalized:
            return brand.title()
    return None


def extract_color(text: str) -> str | None:
    normalized = normalize_text(text)
    for canonical, aliases in COLORS.items():
        if any(alias in normalized for alias in aliases):
            return canonical.title()
    return None


def extract_size(text: str) -> dict[str, Any] | None:
    normalized = normalize_text(text)
    eu = re.search(r"\beu\s?(\d{2})\b", normalized)
    plain = re.search(r"\b(?:uk|us)?\s?(\d{1,2}(?:\.\d)?)\b", normalized)
    if eu:
        eu_size = int(eu.group(1))
        return {"raw": f"EU {eu_size}", "eu": eu_size, "uk": round(eu_size - 34, 1), "us": round(eu_size - 33.5, 1)}
    if plain:
        return {"raw": plain.group(1)}
    return None


def classify_category(text: str) -> str:
    normalized = normalize_text(text)
    scores = {
        category: sum(1 for keyword in keywords if keyword in normalized)
        for category, keywords in CATEGORY_KEYWORDS.items()
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "General"


def extract_material(text: str) -> str | None:
    normalized = normalize_text(text)
    for material in MATERIALS:
        if material in normalized:
            return material
    return None


def enrich_text(text: str) -> dict[str, Any]:
    normalized = normalize_text(text)
    return {
        "normalized_title": normalized.title(),
        "brand": extract_brand(text),
        "category": classify_category(text),
        "color": extract_color(text),
        "size": extract_size(text),
        "material": extract_material(text),
        "confidence": 0.88,
        "method": "rules",
    }


@app.get("/health")
def health():
    return {"ok": True, "service": "ml-service"}


@app.post("/normalize")
def normalize(payload: TextPayload):
    return {"input": payload.text, "normalized": normalize_text(payload.text)}


@app.post("/enrich")
def enrich(payload: TextPayload):
    return enrich_text(payload.text)


@app.post("/dedup/check")
def dedup(payload: DedupPayload):
    left_norm = normalize_text(payload.left)
    right_norm = normalize_text(payload.right)
    left = enrich_text(payload.left)
    right = enrich_text(payload.right)
    title_score = fuzz.token_set_ratio(left_norm, right_norm) / 100
    brand_bonus = 0.05 if left["brand"] and left["brand"] == right["brand"] else 0
    category_bonus = 0.04 if left["category"] == right["category"] else 0
    size_bonus = 0.03 if left["size"] and right["size"] else 0
    confidence = min(0.99, round(title_score + brand_bonus + category_bonus + size_bonus, 3))
    return {
        "is_match": confidence >= 0.85,
        "confidence": confidence,
        "method": "rapidfuzz_token_set_rules",
        "left_normalized": left_norm,
        "right_normalized": right_norm,
        "explanation": "Matched using normalized title similarity with brand, category, and size signals.",
        "signals": {"title_score": round(title_score, 3), "brand_bonus": brand_bonus, "category_bonus": category_bonus, "size_bonus": size_bonus},
    }
