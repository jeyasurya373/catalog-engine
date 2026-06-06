import crypto from "node:crypto";
import { pool, query } from "../src/db/pool.js";
import type { PlatformEntry } from "../src/types.js";

const brands = ["Nike", "Samsung", "Levis", "Lakme", "Adidas", "Sony", "Puma", "Boat", "Maybelline", "Allen Solly"];
const categories = [
  { l1: "Fashion", l2: "Footwear", l3: "Running Shoes" },
  { l1: "Electronics", l2: "Mobiles", l3: "Smartphones" },
  { l1: "Fashion", l2: "Clothing", l3: "Jeans" },
  { l1: "Beauty", l2: "Makeup", l3: "Lipstick" },
  { l1: "Electronics", l2: "Audio", l3: "Headphones" }
];
const colors = ["Black", "White", "Blue", "Red", "Green", "Beige"];
const platforms = ["Amazon.in", "Flipkart", "Myntra"];

function productId(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function platformEntries(pid: string, basePrice: number): PlatformEntry[] {
  return platforms.map((name, index) => {
    const current = Math.round(basePrice * (0.92 + index * 0.04));
    const original = Math.round(current * 1.18);
    return {
      name,
      external_id: `${name.slice(0, 3).toUpperCase()}-${pid}-${index}`,
      url: `https://example.com/${name.toLowerCase().replace(".", "")}/${pid}`,
      price: { current, original, discount_pct: Math.round(((original - current) / original) * 100), currency: "INR" },
      availability: index === 2 ? "limited" : "in_stock",
      rating: { score: Number((3.8 + index * 0.3).toFixed(1)), count: 1000 + index * 321 },
      seller: index === 0 ? "CloudRetail" : index === 1 ? "SuperComNet" : "RetailNet",
      last_crawled_at: new Date().toISOString()
    };
  });
}

async function main() {
  const count = await query<{ count: string }>("SELECT COUNT(*)::text AS count FROM products");
  const hasProducts = Number(count.rows[0]?.count ?? 0) > 0;
  const forceReseed = process.env.FORCE_RESEED === "true";
  if (hasProducts && !forceReseed) {
    console.log("Seed skipped: products already exist. Set FORCE_RESEED=true to reset demo data.");
    return;
  }

  await query("TRUNCATE crawl_events, product_mappings, price_history, products RESTART IDENTITY CASCADE");

  for (let i = 0; i < 50; i++) {
    const brand = brands[i % brands.length];
    const category = categories[i % categories.length];
    const color = colors[i % colors.length];
    const title = `${brand} ${category.l3} ${color} ${i % 5 === 0 ? "EU 42" : ""}`.trim();
    const pid = productId(`${brand}-${title}-${i}`);
    const basePrice = 699 + i * 220;
    const entries = platformEntries(pid, basePrice);
    const attrs = { color, material: i % 2 === 0 ? "cotton" : "synthetic", size: i % 5 === 0 ? "EU 42" : "M" };
    const variants = [{ sku: `${pid}-BLK`, size: attrs.size, color, price_delta: 0 }];

    await query(
      `INSERT INTO products
        (product_id, title, brand, category, attributes, platforms, variants, images, enrichment_status, confidence_scores)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10::jsonb)`,
      [
        pid,
        title,
        brand,
        JSON.stringify(category),
        JSON.stringify(attrs),
        JSON.stringify(entries),
        JSON.stringify(variants),
        [`https://picsum.photos/seed/${pid}/640/480`],
        "complete",
        JSON.stringify({ enrichment: 0.91, dedup: 0.86 })
      ]
    );

    for (const platform of entries) {
      for (let m = 5; m >= 0; m--) {
        const date = new Date();
        date.setMonth(date.getMonth() - m);
        const saleDip = m === 1 && i % 4 === 0 ? 0.82 : 1;
        const price = Math.round(platform.price.current * (1 + (m - 2) * 0.015) * saleDip);
        await query(
          `INSERT INTO price_history (product_id, platform, price, original_price, availability, recorded_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [pid, platform.name, price, platform.price.original, platform.availability, date]
        );
      }
      await query(
        `INSERT INTO product_mappings (master_product_id, platform, platform_sku, match_method, confidence, reviewed)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [pid, platform.name, platform.external_id, "seed_exact", 0.95, true]
      );
    }

    await query(
      `INSERT INTO crawl_events (platform, status, event_type, product_id, message, latency_ms)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [platforms[i % platforms.length], i % 9 === 0 ? "warning" : "success", i % 9 === 0 ? "dom_drift" : "product_crawl", pid, i % 9 === 0 ? "Null selector rate above baseline" : "Seed crawl completed", 450 + i * 7]
    );
  }

  console.log("Seed complete: 50 products with price history and crawl events");
}

main().finally(() => pool.end());
