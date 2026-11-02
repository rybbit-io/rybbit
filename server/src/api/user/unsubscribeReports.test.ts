import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  where: vi.fn(),
}));

vi.mock("../../db/postgres/postgres.js", () => ({
  db: {
    update: () => ({ set: (values: unknown) => (mocks.set(values), { where: mocks.where }) }),
  },
}));
vi.mock("../../lib/const.js", () => ({ SECRET: "test-secret" }));

import { signExpiringPayload } from "../../lib/signedToken.js";
import { oneClickUnsubscribeReports } from "./unsubscribeReports.js";

type Query = { userId?: string; exp?: string; sig?: string };

function requestStub(method: string, query: Query) {
  return { method, query, log: { error: vi.fn() } } as unknown as FastifyRequest<{ Querystring: Query }>;
}

function replyStub() {
  return {
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

function signedQuery(userId = "u1"): Query {
  const { exp, sig } = signExpiringPayload(`unsubscribe-reports:${userId}`, 3600);
  return { userId, exp: String(exp), sig };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.where.mockResolvedValue(undefined);
});

describe("one-click weekly report unsubscribe", () => {
  it("turns off weekly reports from the footer link and confirms it", async () => {
    const reply = replyStub();
    await oneClickUnsubscribeReports(requestStub("GET", signedQuery()), reply);

    expect(mocks.set).toHaveBeenCalledWith({ sendAutoEmailReports: false });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(expect.stringContaining("Weekly reports turned off"));
  });

  it("answers an email client's List-Unsubscribe-Post with a bare 200", async () => {
    const reply = replyStub();
    await oneClickUnsubscribeReports(requestStub("POST", signedQuery()), reply);

    expect(mocks.set).toHaveBeenCalledWith({ sendAutoEmailReports: false });
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it("rejects a link signed for another user", async () => {
    const reply = replyStub();
    await oneClickUnsubscribeReports(requestStub("POST", { ...signedQuery("u1"), userId: "u2" }), reply);

    expect(mocks.set).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it("rejects a link with no signature", async () => {
    const reply = replyStub();
    await oneClickUnsubscribeReports(requestStub("GET", { userId: "u1" }), reply);

    expect(mocks.set).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it("reports a failed update instead of confirming it", async () => {
    mocks.where.mockRejectedValue(new Error("db down"));
    const reply = replyStub();
    await oneClickUnsubscribeReports(requestStub("POST", signedQuery()), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });
});
