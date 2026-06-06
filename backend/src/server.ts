import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import crypto from "node:crypto";
import { config } from "./config.js";
import { redis, redisSub } from "./services/redis.js";
import { simulatePriceChange } from "./services/simulator.js";
import { productRoutes } from "./routes/products.js";
import { mlRoutes } from "./routes/ml.js";
import { crawlRoutes } from "./routes/crawl.js";
import { streamRoutes } from "./routes/stream.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Rubick Catalog Intelligence API",
        description: "Prototype API for catalog search, price history, comparison, deduplication, crawl simulation, and SSE price updates.",
        version: "1.0.0"
      },
      servers: [{ url: config.publicApiUrl, description: "Backend API" }],
      tags: [
        { name: "System" },
        { name: "Products" },
        { name: "ML" },
        { name: "Crawl" },
        { name: "Stream" }
      ]
    }
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    }
  });

  app.decorate("httpErrors", {
    notFound: (message: string) => Object.assign(new Error(message), { statusCode: 404 }),
    badGateway: (message: string) => Object.assign(new Error(message), { statusCode: 502 })
  });

  app.addHook("onRequest", async (request, reply) => {
    const requestId = request.headers["x-request-id"]?.toString() ?? crypto.randomUUID();
    reply.header("x-request-id", requestId);
    if (process.env.NODE_ENV === "test") return;

    const ip = request.ip;
    const key = `rate:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > 300) {
      throw Object.assign(new Error("Rate limit exceeded"), { statusCode: 429 });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = (error as Error & { statusCode?: number }).statusCode ?? (error.name === "ZodError" ? 400 : 500);
    reply.code(statusCode).send({ error: error.message, statusCode });
  });

  app.addHook("onClose", async () => {
    redis.disconnect();
    redisSub.disconnect();
  });

  app.get("/health", {
    schema: {
      tags: ["System"],
      summary: "Backend health check"
    }
  }, async () => ({ ok: true, service: "backend", time: new Date().toISOString() }));
  await app.register(productRoutes);
  await app.register(mlRoutes);
  await app.register(crawlRoutes);
  await app.register(streamRoutes);

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = await buildApp();
  app.listen({ port: config.port, host: "0.0.0.0" });
  setInterval(() => simulatePriceChange().catch((error) => app.log.warn(error)), 15_000);
}

declare module "fastify" {
  interface FastifyInstance {
    httpErrors: {
      notFound(message: string): Error & { statusCode: number };
      badGateway(message: string): Error & { statusCode: number };
    };
  }
}
