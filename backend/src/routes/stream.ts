import type { FastifyInstance } from "fastify";
import { redisSub } from "../services/redis.js";

type Client = { write: (chunk: string) => void; end: () => void };
const clients = new Set<Client>();
let subscribed = false;

export async function streamRoutes(app: FastifyInstance) {
  async function ensureSubscribed() {
    if (subscribed) return;
    subscribed = true;
    await redisSub.subscribe("price-events");
    redisSub.on("message", (_channel: string, message: string) => {
      for (const client of clients) client.write(`data: ${message}\n\n`);
    });
  }

  app.get("/stream/prices", {
    schema: {
      tags: ["Stream"],
      summary: "Subscribe to live price update events through Server-Sent Events"
    }
  }, async (_request, reply) => {
    await ensureSubscribed();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*"
    });
    reply.hijack();
    const client = reply.raw as Client;
    clients.add(client);
    client.write(`data: ${JSON.stringify({ type: "connected", at: new Date().toISOString() })}\n\n`);
    reply.raw.on("close", () => clients.delete(client));
  });
}
