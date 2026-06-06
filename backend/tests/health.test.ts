import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server.js";

describe("health", () => {
  it("returns service status", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    await app.close();
  });
});
