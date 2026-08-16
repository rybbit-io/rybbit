import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveTrackingRequest: vi.fn(),
  ingestEvent: vi.fn(),
}));

vi.mock("./trackingRequest.js", () => ({
  resolveTrackingRequest: mocks.resolveTrackingRequest,
}));

vi.mock("./ingestEvent.js", () => ({
  ingestEvent: mocks.ingestEvent,
}));

import { trackEvent } from "./trackEvent.js";

const resolvedRequest = { payload: { site_id: "site_abc" }, site: { siteId: 42 } };

function requestWithBody(body: unknown): FastifyRequest {
  return { body, headers: {}, ip: "198.51.100.10" } as unknown as FastifyRequest;
}

function replyStub(): FastifyReply {
  const reply = {
    status: vi.fn(function (this: typeof reply) {
      return this;
    }),
    send: vi.fn(function (this: typeof reply) {
      return this;
    }),
  };
  return reply as unknown as FastifyReply;
}

describe("trackEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveTrackingRequest.mockResolvedValue(resolvedRequest);
    mocks.ingestEvent.mockResolvedValue({ status: "tracked", sessionId: "session-alice" });
  });

  it("rejects a payload that fails validation without resolving anything", async () => {
    const reply = replyStub();

    await trackEvent(requestWithBody({ type: "pageview" }), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(mocks.resolveTrackingRequest).not.toHaveBeenCalled();
    expect(mocks.ingestEvent).not.toHaveBeenCalled();
  });

  it("answers 404 when the Site is unknown", async () => {
    mocks.resolveTrackingRequest.mockResolvedValue(null);
    const reply = replyStub();

    await trackEvent(requestWithBody({ type: "pageview", site_id: "nope" }), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ success: false, error: "Site not found" });
    expect(mocks.ingestEvent).not.toHaveBeenCalled();
  });

  it("hands the resolved Tracking Request to ingestion and reports success", async () => {
    const reply = replyStub();

    await trackEvent(requestWithBody({ type: "pageview", site_id: "site_abc" }), reply);

    expect(mocks.ingestEvent).toHaveBeenCalledWith(resolvedRequest);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ success: true });
  });

  it("maps a Site Exclusion Decision to the event skip response", async () => {
    mocks.ingestEvent.mockResolvedValue({
      status: "excluded",
      exclusion: { excluded: true, reason: "path", label: "path", value: "/admin/users" },
    });
    const reply = replyStub();

    await trackEvent(requestWithBody({ type: "pageview", site_id: "site_abc" }), reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      message: "Event not tracked - path excluded",
    });
  });

  it("reports the monthly limit without failing the request", async () => {
    mocks.ingestEvent.mockResolvedValue({ status: "over_limit" });
    const reply = replyStub();

    await trackEvent(requestWithBody({ type: "pageview", site_id: "site_abc" }), reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith("Site over monthly limit, event not tracked");
  });

  it("answers a detected bot with the same success shape as a tracked event", async () => {
    mocks.ingestEvent.mockResolvedValue({ status: "bot" });
    const reply = replyStub();

    await trackEvent(requestWithBody({ type: "pageview", site_id: "site_abc" }), reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ success: true });
  });

  it("turns an ingestion failure into a 500", async () => {
    mocks.ingestEvent.mockRejectedValue(new Error("ClickHouse unavailable"));
    const reply = replyStub();

    await trackEvent(requestWithBody({ type: "pageview", site_id: "site_abc" }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ success: false, error: "Failed to track event" });
  });
});
