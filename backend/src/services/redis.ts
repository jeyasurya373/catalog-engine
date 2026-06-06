import { Redis } from "ioredis";
import { config } from "../config.js";

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });
export const redisSub = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await loader();
  const jitter = Math.floor(ttlSeconds * (0.9 + Math.random() * 0.2));
  await redis.set(key, JSON.stringify(value), "EX", jitter);
  return value;
}

export async function invalidateProductCache(productId?: string) {
  const keys = await redis.keys("cache:*");
  if (keys.length) await redis.del(keys);
  if (productId) await redis.publish("price-events", JSON.stringify({ type: "cache_invalidated", productId }));
}
