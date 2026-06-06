import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db/pool.js";
import { simulatePriceChange } from "../services/simulator.js";

export async function crawlRoutes(app: FastifyInstance) {
  app.post("/crawl/simulate", {
    schema: {
      tags: ["Crawl"],
      summary: "Simulate a confirmed price crawl update",
      body: {
        type: "object",
        properties: { product_id: { type: "string" } }
      }
    }
  }, async (request) => {
    const body = z.object({ product_id: z.string().optional() }).parse(request.body ?? {});
    return simulatePriceChange(body.product_id);
  });

  app.get("/crawl/status", {
    schema: {
      tags: ["Crawl"],
      summary: "Get recent simulated crawl events"
    }
  }, async () => {
    const result = await query(
      `SELECT * FROM crawl_events ORDER BY created_at DESC LIMIT 50`
    );
    return { events: result.rows };
  });
}
