from app.main import enrich_text, normalize_text
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_enrichment_extracts_signals():
    enriched = enrich_text("Nike Airmax Shoes Size EU 42 Black Mesh")
    assert enriched["brand"] == "Nike"
    assert enriched["category"] == "Footwear"
    assert enriched["color"] == "Black"
    assert enriched["size"]["eu"] == 42
    assert enriched["material"] == "mesh"


def test_normalize_airmax():
    assert "air max" in normalize_text("Nike Airmax Shoes")


def test_dedup_match():
    response = client.post("/dedup/check", json={"left": "Nike Air Max Black EU 42", "right": "Nike Airmax Shoes Size 8 Black"})
    assert response.status_code == 200
    assert response.json()["is_match"] is True


def test_dedup_rejects_different_products():
    response = client.post("/dedup/check", json={"left": "Nike Running Shoes Black", "right": "Lakme Matte Lipstick Red"})
    assert response.status_code == 200
    assert response.json()["is_match"] is False
