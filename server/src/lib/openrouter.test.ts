import { afterEach, describe, expect, it, vi } from "vitest";
import { callOpenRouter } from "./openrouter.js";

function mockOpenRouterResponse(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
    })
  );
}

describe("callOpenRouter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns assistant content", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    mockOpenRouterResponse({
      id: "completion-id",
      choices: [
        {
          message: { role: "assistant", content: "SELECT count() FROM scoped_events" },
          finish_reason: "stop",
        },
      ],
    });

    await expect(callOpenRouter([{ role: "user", content: "count events" }])).resolves.toBe(
      "SELECT count() FROM scoped_events"
    );
  });

  it("rejects null assistant content", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    mockOpenRouterResponse({
      id: "completion-id",
      choices: [
        {
          message: { role: "assistant", content: null },
          finish_reason: "stop",
        },
      ],
    });

    await expect(callOpenRouter([{ role: "user", content: "count events" }])).rejects.toThrow(
      "OpenRouter returned an empty response"
    );
  });
});
