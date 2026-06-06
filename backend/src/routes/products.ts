import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db/pool.js";
import { cached } from "../services/redis.js";

const listQuery = z.object({
  q: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  platform: z.string().optional(),
  status: z.string().optional(),
  cursor: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(50).default(20)
});

export async function productRoutes(app: FastifyInstance) {
  app.get("/products", {
    schema: {
      tags: ["Products"],
      summary: "List products with search, filters, and cursor pagination",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          brand: { type: "string" },
          category: { type: "string" },
          platform: { type: "string" },
          status: { type: "string" },
          cursor: { type: "number" },
          limit: { type: "number", default: 20 }
        }
      }
    }
  }, async (request) => {
    const params = listQuery.parse(request.query);
    const cacheKey = `cache:products:${JSON.stringify(params)}`;
    return cached(cacheKey, 300, async () => {
      const values: unknown[] = [];
      const where: string[] = [];

      if (params.cursor) {
        values.push(params.cursor);
        where.push(`id > $${values.length}`);
      }
      if (params.q) {
        values.push(`%${params.q}%`);
        where.push(`title ILIKE $${values.length}`);
      }
      if (params.brand) {
        values.push(params.brand);
        where.push(`brand = $${values.length}`);
      }
      if (params.category) {
        values.push(params.category);
        where.push(`category->>'l2' = $${values.length}`);
      }
      if (params.platform) {
        values.push(`%${params.platform}%`);
        where.push(`platforms::text ILIKE $${values.length}`);
      }
      if (params.status) {
        values.push(params.status);
        where.push(`enrichment_status = $${values.length}`);
      }

      values.push(params.limit + 1);
      const sql = `
        SELECT * FROM products
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY id ASC
        LIMIT $${values.length}`;
      const result = await query(sql, values);
      const rows = result.rows;
      const hasMore = rows.length > params.limit;
      const items = hasMore ? rows.slice(0, params.limit) : rows;
      return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
    });
  });

  app.get("/products/:id", {
    schema: {
      tags: ["Products"],
      summary: "Get one normalized product by product ID",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } }
      }
    }
  }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return cached(`cache:product:${id}`, 300, async () => {
      const result = await query("SELECT * FROM products WHERE product_id = $1", [id]);
      if (!result.rows[0]) throw app.httpErrors.notFound("Product not found");
      return result.rows[0];
    });
  });

  app.get("/products/:id/price-history", {
    schema: {
      tags: ["Products"],
      summary: "Get chart-ready price history for one product",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } }
      }
    }
  }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return cached(`cache:price-history:${id}`, 60, async () => {
      const result = await query(
        `SELECT platform, price::float, original_price::float, currency, availability, recorded_at
         FROM price_history WHERE product_id = $1 ORDER BY recorded_at ASC`,
        [id]
      );
      return { product_id: id, points: result.rows };
    });
  });

  app.get("/compare", {
    schema: {
      tags: ["Products"],
      summary: "Compare multiple products by comma-separated product IDs",
      querystring: {
        type: "object",
        required: ["ids"],
        properties: { ids: { type: "string", examples: ["abc123,def456"] } }
      }
    }
  }, async (request) => {
    const { ids } = z.object({ ids: z.string() }).parse(request.query);
    const productIds = ids.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 8);
    return cached(`cache:compare:${productIds.join(",")}`, 120, async () => {
      const result = await query("SELECT * FROM products WHERE product_id = ANY($1)", [productIds]);
      return { items: result.rows };
    });
  });
}
