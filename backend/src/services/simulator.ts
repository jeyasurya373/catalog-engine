import { query } from "../db/pool.js";
import { redis, invalidateProductCache } from "./redis.js";
import type { Product } from "../types.js";

export async function simulatePriceChange(productId?: string) {
  const productResult = await query<Product>(
    productId
      ? "SELECT * FROM products WHERE product_id = $1 LIMIT 1"
      : "SELECT * FROM products ORDER BY random() LIMIT 1",
    productId ? [productId] : []
  );
  const product = productResult.rows[0];
  if (!product) throw new Error("Product not found");

  const platforms = [...product.platforms];
  const index = Math.floor(Math.random() * platforms.length);
  const entry = { ...platforms[index], price: { ...platforms[index].price } };
  const oldPrice = entry.price.current;
  const factor = 0.9 + Math.random() * 0.2;
  const newPrice = Math.max(99, Math.round(oldPrice * factor));
  entry.price.current = newPrice;
  entry.price.discount_pct = Math.round(((entry.price.original - newPrice) / entry.price.original) * 100);
  entry.last_crawled_at = new Date().toISOString();
  platforms[index] = entry;

  await query("UPDATE products SET platforms = $1, updated_at = NOW() WHERE product_id = $2", [JSON.stringify(platforms), product.product_id]);
  await query(
    `INSERT INTO price_history (product_id, platform, price, original_price, availability)
     VALUES ($1,$2,$3,$4,$5)`,
    [product.product_id, entry.name, newPrice, entry.price.original, entry.availability]
  );
  await query(
    `INSERT INTO crawl_events (platform, status, event_type, product_id, message, latency_ms)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [entry.name, "success", "price_update", product.product_id, `Price changed from INR ${oldPrice} to INR ${newPrice}`, Math.round(300 + Math.random() * 700)]
  );

  const event = {
    type: "price_update",
    product_id: product.product_id,
    title: product.title,
    platform: entry.name,
    old_price: oldPrice,
    new_price: newPrice,
    changed_at: new Date().toISOString()
  };

  await invalidateProductCache(product.product_id);
  await redis.publish("price-events", JSON.stringify(event));
  return event;
}
