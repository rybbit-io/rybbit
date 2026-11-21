import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reload: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: { reload: mocks.reload },
}));

import {
  getSiteExcludedASNs,
  getSiteExcludedCountries,
  getSiteExcludedHostnames,
  getSiteExcludedIPs,
  getSiteExcludedPaths,
  getSiteExcludedQueryParams,
  getSiteExcludedUserAgents,
} from "./getSiteExclusions.js";

function createReply() {
  const reply = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(body: unknown) {
      reply.body = body;
      return reply;
    },
  };
  return reply;
}

function createRequest(params: unknown) {
  return { params, log: { error: vi.fn() } } as any;
}

describe("exclusion endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reload.mockResolvedValue({
      siteId: 123,
      excludedIPs: ["10.0.0.1"],
      excludedCountries: ["DE"],
      excludedPaths: ["/admin"],
      excludedHostnames: ["staging.example.com"],
      excludedUserAgents: ["curl"],
      excludedASNs: ["AS13335"],
      excludedQueryParams: ["fbclid"],
    });
  });

  const endpoints = [
    { handler: getSiteExcludedIPs, key: "excludedIPs", value: ["10.0.0.1"] },
    { handler: getSiteExcludedCountries, key: "excludedCountries", value: ["DE"] },
    { handler: getSiteExcludedPaths, key: "excludedPaths", value: ["/admin"] },
    { handler: getSiteExcludedHostnames, key: "excludedHostnames", value: ["staging.example.com"] },
    { handler: getSiteExcludedUserAgents, key: "excludedUserAgents", value: ["curl"] },
    { handler: getSiteExcludedASNs, key: "excludedASNs", value: ["AS13335"] },
    { handler: getSiteExcludedQueryParams, key: "excludedQueryParams", value: ["fbclid"] },
  ];

  for (const { handler, key, value } of endpoints) {
    it(`returns ${key} under its own field name`, async () => {
      const reply = createReply();
      await handler(createRequest({ siteId: "123" }), reply as any);

      expect(mocks.reload).toHaveBeenCalledWith(123);
      expect(reply.statusCode).toBe(200);
      expect(reply.body).toEqual({ success: true, [key]: value });
    });
  }

  // getSiteExcludedCountries used to be a hand-copy that skipped this guard and
  // passed NaN straight into the query.
  it.each(["abc", "0", "-1", "1.5"])("rejects %s as a site id without querying", async siteId => {
    const reply = createReply();
    await getSiteExcludedCountries(createRequest({ siteId }), reply as any);

    expect(reply.statusCode).toBe(400);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("rejects a missing site id", async () => {
    const reply = createReply();
    await getSiteExcludedIPs(createRequest({}), reply as any);

    expect(reply.statusCode).toBe(400);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("404s when no site matches", async () => {
    mocks.reload.mockResolvedValue(undefined);
    const reply = createReply();
    await getSiteExcludedIPs(createRequest({ siteId: "123" }), reply as any);

    expect(reply.statusCode).toBe(404);
  });

  // The API playground renders the error body verbatim, so a Postgres outage
  // has to read as one rather than as "Site not found".
  it("500s when the configuration read throws", async () => {
    mocks.reload.mockRejectedValue(new Error("postgres is down"));
    const reply = createReply();
    await getSiteExcludedIPs(createRequest({ siteId: "123" }), reply as any);

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({ success: false, error: "Failed to get excluded IPs" });
  });
});
