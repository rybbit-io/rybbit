import type { FastifyReply, FastifyRequest } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  unsubscribeContact: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    select: () => ({ from: () => ({ where: mocks.findUser }) }),
  },
}));
vi.mock("../../lib/email/email.js", () => ({ unsubscribeContact: mocks.unsubscribeContact }));
vi.mock("../../lib/const.js", () => ({ SECRET: "test-secret" }));

import { signExpiringPayload, signPayload } from "../../lib/signedToken.js";
import { oneClickUnsubscribeMarketing, unsubscribeMarketing } from "./unsubscribeMarketing.js";

type UnsubscribeQuery = { email?: string; exp?: string; sig?: string };

function requestStub(method = "POST", query: UnsubscribeQuery = {}, userId?: string) {
  return {
    method,
    query,
    user: userId ? { id: userId } : undefined,
    log: { error: vi.fn() },
  } as unknown as FastifyRequest<{ Querystring: UnsubscribeQuery }>;
}

function replyStub() {
  return {
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

const email = "ada@example.com";

function signedQuery(): UnsubscribeQuery {
  const { exp, sig } = signExpiringPayload(`unsubscribe:${email}`, 3600);
  return { email, exp: String(exp), sig };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-29T12:00:00Z"));
  vi.clearAllMocks();
  mocks.findUser.mockResolvedValue([{ email }]);
  mocks.unsubscribeContact.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("authenticated marketing unsubscribe", () => {
  it("unsubscribes the authenticated user's contact", async () => {
    const reply = replyStub();
    await unsubscribeMarketing(requestStub("POST", {}, "u1"), reply);

    expect(mocks.unsubscribeContact).toHaveBeenCalledWith(email);
    expect(reply.send).toHaveBeenCalledWith({
      success: true,
      message: "Successfully unsubscribed from marketing emails",
    });
  });

  it("returns 401 without authentication", async () => {
    const reply = replyStub();
    await unsubscribeMarketing(requestStub(), reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.unsubscribeContact).not.toHaveBeenCalled();
  });

  it("returns 404 if the authenticated user no longer exists", async () => {
    mocks.findUser.mockResolvedValue([]);
    const reply = replyStub();
    await unsubscribeMarketing(requestStub("POST", {}, "deleted"), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: "User not found" });
    expect(mocks.unsubscribeContact).not.toHaveBeenCalled();
  });

  it("returns 500 when unsubscribing fails", async () => {
    mocks.unsubscribeContact.mockRejectedValue(new Error("Contact update failed"));
    const reply = replyStub();
    await unsubscribeMarketing(requestStub("POST", {}, "u1"), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Failed to unsubscribe" });
  });
});

describe("one-click marketing unsubscribe", () => {
  it("honors signed POST requests even without a matching database user", async () => {
    mocks.findUser.mockResolvedValue([]);
    const reply = replyStub();
    await oneClickUnsubscribeMarketing(requestStub("POST", signedQuery()), reply);

    expect(mocks.unsubscribeContact).toHaveBeenCalledWith(email);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith();
  });

  it("shows the confirmation page for signed GET links", async () => {
    const reply = replyStub();
    await oneClickUnsubscribeMarketing(requestStub("GET", signedQuery()), reply);

    expect(mocks.unsubscribeContact).toHaveBeenCalledWith(email);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.type).toHaveBeenCalledWith("text/html");
    expect(reply.send).toHaveBeenCalledWith(expect.stringContaining("<h1>Unsubscribed</h1>"));
  });

  it("honors unsigned links only before the legacy cutoff", async () => {
    const before = replyStub();
    await oneClickUnsubscribeMarketing(requestStub("POST", { email }), before);
    expect(mocks.unsubscribeContact).toHaveBeenCalledWith(email);
    expect(before.status).toHaveBeenCalledWith(200);

    mocks.unsubscribeContact.mockClear();
    vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
    const atCutoff = replyStub();
    await oneClickUnsubscribeMarketing(requestStub("POST", { email }), atCutoff);
    expect(atCutoff.status).toHaveBeenCalledWith(400);
    expect(mocks.unsubscribeContact).not.toHaveBeenCalled();
  });

  it("keeps valid signed links working after the legacy cutoff", async () => {
    vi.setSystemTime(new Date("2026-12-02T00:00:00Z"));
    const reply = replyStub();
    await oneClickUnsubscribeMarketing(requestStub("POST", signedQuery()), reply);

    expect(mocks.unsubscribeContact).toHaveBeenCalledWith(email);
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it.each(["tampered", "expired", "partial"])("rejects a %s signed link during the legacy window", async kind => {
    let query = signedQuery();
    if (kind === "tampered") query = { ...query, email: "other@example.com" };
    if (kind === "partial") query = { email, exp: query.exp };
    if (kind === "expired") {
      const exp = Math.floor(Date.now() / 1000) - 1;
      query = { email, exp: String(exp), sig: signPayload(`unsubscribe:${email}:${exp}`) };
    }
    const reply = replyStub();
    await oneClickUnsubscribeMarketing(requestStub("POST", query), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "Invalid or expired unsubscribe link" });
    expect(mocks.unsubscribeContact).not.toHaveBeenCalled();
  });

  it.each(["GET", "POST"])("returns 400 for a %s request without an email", async method => {
    const reply = replyStub();
    await oneClickUnsubscribeMarketing(requestStub(method), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(mocks.unsubscribeContact).not.toHaveBeenCalled();
    if (method === "GET") {
      expect(reply.type).toHaveBeenCalledWith("text/html");
    } else {
      expect(reply.send).toHaveBeenCalledWith({ error: "Email is required" });
    }
  });

  it("keeps the 200 response for email clients when unsubscribing fails", async () => {
    mocks.unsubscribeContact.mockRejectedValue(new Error("Contact update failed"));
    const request = requestStub("POST", signedQuery());
    const reply = replyStub();
    await oneClickUnsubscribeMarketing(request, reply);

    expect(request.log.error).toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith();
  });
});
