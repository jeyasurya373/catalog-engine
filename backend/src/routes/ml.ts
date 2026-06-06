import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../config.js";

const dedupSchema = z.object({
  left: z.string().min(2),
  right: z.string().min(2)
});

export async function mlRoutes(app: FastifyInstance) {
  app.post("/dedup/check", {
    schema: {
      tags: ["ML"],
      summary: "Check whether two product titles refer to the same product",
      body: {
        type: "object",
        required: ["left", "right"],
        properties: {
          left: { type: "string", examples: ["Nike Air Max Black EU 42"] },
          right: { type: "string", examples: ["Nike Airmax Shoes Size 8 Black"] }
        }
      }
    }
  }, async (request) => {
    const body = dedupSchema.parse(request.body);
    const response = await fetch(`${config.mlServiceUrl}/dedup/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw app.httpErrors.badGateway("ML service failed");
    return response.json();
  });
}
