import { describe, expect, it } from "vitest";
import { eventSchema, payloadSchema } from "./events.js";

describe("eventSchema validation", () => {
  const baseEvent = {
    timestamp: "2024-12-01T10:00:00.000Z",
    page_url: "https://example.com/page",
    path: "/page",
    session_id: "sess_123",
  };

  it("accepts a minimal valid event", () => {
    const parsed = eventSchema.parse(baseEvent);
    expect(parsed).toMatchObject({ session_id: "sess_123" });
  });

  it("accepts when anon_id is provided instead of session_id", () => {
    const parsed = eventSchema.parse({
      ...baseEvent,
      session_id: undefined,
      anon_id: "anon_1",
    });
    expect(parsed.anon_id).toBe("anon_1");
  });

  it("rejects when no identifier is provided", () => {
    expect(() =>
      eventSchema.parse({
        ...baseEvent,
        session_id: undefined,
      })
    ).toThrowError(/One of session_id, anon_id or user_id must be provided/);
  });

  it("rejects invalid timestamp", () => {
    expect(() =>
      eventSchema.parse({
        ...baseEvent,
        timestamp: "invalid-date",
      })
    ).toThrow();
  });
});

describe("payloadSchema batching", () => {
  const baseEvent = {
    timestamp: "2024-12-01T10:00:00.000Z",
    session_id: "sess_123",
  };

  it("accepts a single event object", () => {
    expect(() => payloadSchema.parse(baseEvent)).not.toThrow();
  });

  it("accepts an array of events", () => {
    const batch = Array.from({ length: 3 }, (_, index) => ({
      ...baseEvent,
      session_id: `sess_${index}`,
    }));
    expect(() => payloadSchema.parse(batch)).not.toThrow();
  });

  it("rejects empty arrays", () => {
    expect(() => payloadSchema.parse([])).toThrow();
  });
});
