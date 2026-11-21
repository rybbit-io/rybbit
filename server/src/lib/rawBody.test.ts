import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { keepRawJsonBody } from "./rawBody.js";

async function buildServer() {
  const server = Fastify();
  await server.register(async scope => {
    keepRawJsonBody(scope);
    scope.post("/hook", async request => ({ body: request.body, raw: request.rawBody?.toString("utf8") }));
  });
  server.post("/other", async request => ({ hasRaw: request.rawBody !== undefined }));
  return server;
}

describe("keepRawJsonBody", () => {
  it("parses JSON and keeps the exact bytes, whitespace included", async () => {
    const server = await buildServer();
    const payload = '{ "id":"evt_1",  "n": 1 }';

    const response = await server.inject({
      method: "POST",
      url: "/hook",
      headers: { "content-type": "application/json; charset=utf-8" },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ body: { id: "evt_1", n: 1 }, raw: payload });
  });

  it("answers 400 for malformed JSON", async () => {
    const server = await buildServer();

    const response = await server.inject({
      method: "POST",
      url: "/hook",
      headers: { "content-type": "application/json" },
      payload: "{nope",
    });

    expect(response.statusCode).toBe(400);
  });

  it("leaves routes outside its scope on the default parser", async () => {
    const server = await buildServer();

    const response = await server.inject({ method: "POST", url: "/other", payload: { a: 1 } });

    expect(response.json()).toEqual({ hasRaw: false });
  });
});
