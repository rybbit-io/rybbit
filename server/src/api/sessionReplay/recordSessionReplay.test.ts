import { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { recordSessionReplay } from "./recordSessionReplay.js";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  decideSiteExclusion: vi.fn(),
  isSiteOverLimit: vi.fn(),
  isSiteWithoutReplay: vi.fn(),
  recordEvents: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: {
    getConfig: mocks.getConfig,
  },
}));

vi.mock("../../services/sites/siteExclusionDecision.js", () => ({
  decideSiteExclusion: mocks.decideSiteExclusion,
}));

vi.mock("../../services/usageService.js", () => ({
  usageService: {
    isSiteOverLimit: mocks.isSiteOverLimit,
    isSiteWithoutReplay: mocks.isSiteWithoutReplay,
  },
}));

vi.mock("../../services/replay/sessionReplayIngestService.js", () => ({
  SessionReplayIngestService: vi.fn().mockImplementation(() => ({
    recordEvents: mocks.recordEvents,
  })),
}));

type ReplyStub = FastifyReply & {
  statusCodeValue: number;
  sentPayload: unknown;
};

type ReplayRequest = FastifyRequest<{
  Params: { siteId: string };
  Body: RecordSessionReplayRequest;
}>;

type RequestOverrides = {
  body?: RecordSessionReplayRequest;
  headers?: Record<string, string>;
  ip?: string;
  params?: { siteId: string };
};

const baseConfig = {
  siteId: 42,
  sessionReplay: true,
  excludedIPs: [],
  excludedCountries: [],
  excludedPaths: [],
  excludedHostnames: [],
  excludedUserAgents: [],
};

const baseBody: RecordSessionReplayRequest = {
  userId: "user-1",
  events: [{ type: 2, data: { source: 0 }, timestamp: 1_700_000_000_000 }],
  metadata: {
    pageUrl: "https://example.com/admin/users?tab=settings",
    viewportWidth: 1280,
    viewportHeight: 720,
    language: "en-US",
  },
};

function createRequest(overrides: RequestOverrides = {}): ReplayRequest {
  return {
    params: overrides.params ?? { siteId: "site_abc" },
    body: overrides.body ?? baseBody,
    headers: {
      "user-agent": "Mozilla/5.0 HeadlessChrome/120",
      "x-real-ip": "198.51.100.10",
      origin: "https://example.com",
      referer: "https://example.com/admin/users",
      ...overrides.headers,
    },
    ip: overrides.ip ?? "203.0.113.10",
    log: {
      error: mocks.loggerError,
      info: mocks.loggerInfo,
    },
  } as unknown as ReplayRequest;
}

function createReply(): ReplyStub {
  const reply = {
    statusCodeValue: 200,
    sentPayload: undefined,
    status: vi.fn(function (this: ReplyStub, statusCode: number) {
      this.statusCodeValue = statusCode;
      return this;
    }),
    send: vi.fn(function (this: ReplyStub, payload: unknown) {
      this.sentPayload = payload;
      return this;
    }),
  };

  return reply as unknown as ReplyStub;
}

describe("recordSessionReplay exclusions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockResolvedValue(baseConfig);
    mocks.decideSiteExclusion.mockResolvedValue({ excluded: false });
    mocks.isSiteOverLimit.mockReturnValue(false);
    mocks.isSiteWithoutReplay.mockReturnValue(false);
    mocks.recordEvents.mockResolvedValue(undefined);
  });

  it("records the replay when the Site Exclusion Decision accepts the request", async () => {
    const reply = createReply();

    await recordSessionReplay(createRequest(), reply);

    expect(mocks.decideSiteExclusion).toHaveBeenCalledOnce();
    expect(mocks.recordEvents).toHaveBeenCalledWith(42, baseBody, {
      userAgent: "Mozilla/5.0 HeadlessChrome/120",
      ipAddress: "198.51.100.10",
      origin: "https://example.com",
      referrer: "https://example.com/admin/users",
    });
    expect(reply.sentPayload).toEqual({ success: true });
  });

  it("maps an IP Site Exclusion Decision to the replay skip response", async () => {
    mocks.getConfig.mockResolvedValue({
      ...baseConfig,
      excludedIPs: ["198.51.100.0/24"],
    });
    mocks.decideSiteExclusion.mockResolvedValue({
      excluded: true,
      reason: "ip",
      label: "IP",
      value: "198.51.100.10",
    });

    const reply = createReply();
    await recordSessionReplay(createRequest(), reply);

    expect(mocks.decideSiteExclusion).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: 42, excludedIPs: ["198.51.100.0/24"] }),
      {
        ipAddress: "198.51.100.10",
        candidateIps: ["198.51.100.10", "203.0.113.10"],
        pathname: "/admin/users",
        querystring: "?tab=settings",
        hostname: "example.com",
        userAgent: "Mozilla/5.0 HeadlessChrome/120",
      }
    );
    expect(mocks.recordEvents).not.toHaveBeenCalled();
    expect(reply.sentPayload).toEqual({
      success: true,
      message: "Session replay not recorded - IP excluded",
    });
  });

  it("does not record replay batches for excluded page paths", async () => {
    mocks.getConfig.mockResolvedValue({
      ...baseConfig,
      excludedPaths: ["/admin/*"],
    });
    mocks.decideSiteExclusion.mockResolvedValue({
      excluded: true,
      reason: "path",
      label: "path",
      value: "/admin/users",
    });

    const reply = createReply();
    await recordSessionReplay(createRequest(), reply);

    expect(mocks.decideSiteExclusion).toHaveBeenCalledWith(
      expect.objectContaining({ excludedPaths: ["/admin/*"] }),
      expect.objectContaining({ pathname: "/admin/users" })
    );
    expect(mocks.recordEvents).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.sentPayload).toEqual({
      success: true,
      message: "Session replay not recorded - path excluded",
    });
  });

  it("does not record replay batches for excluded hostnames", async () => {
    mocks.getConfig.mockResolvedValue({
      ...baseConfig,
      excludedHostnames: ["*.vercel.app"],
    });
    mocks.decideSiteExclusion.mockResolvedValue({
      excluded: true,
      reason: "hostname",
      label: "hostname",
      value: "preview.vercel.app",
    });

    const reply = createReply();
    await recordSessionReplay(
      createRequest({
        body: {
          ...baseBody,
          metadata: {
            pageUrl: "https://preview.vercel.app/app",
          },
        },
      }),
      reply
    );

    expect(mocks.decideSiteExclusion).toHaveBeenCalledWith(
      expect.objectContaining({ excludedHostnames: ["*.vercel.app"] }),
      expect.objectContaining({ hostname: "preview.vercel.app", pathname: "/app" })
    );
    expect(mocks.recordEvents).not.toHaveBeenCalled();
    expect(reply.sentPayload).toEqual({
      success: true,
      message: "Session replay not recorded - hostname excluded",
    });
  });

  it("does not record replay batches for excluded user agents", async () => {
    mocks.getConfig.mockResolvedValue({
      ...baseConfig,
      excludedUserAgents: ["HeadlessChrome"],
    });
    mocks.decideSiteExclusion.mockResolvedValue({
      excluded: true,
      reason: "user_agent",
      label: "user agent",
      value: "Mozilla/5.0 HeadlessChrome/120",
    });

    const reply = createReply();
    await recordSessionReplay(createRequest(), reply);

    expect(mocks.decideSiteExclusion).toHaveBeenCalledWith(
      expect.objectContaining({ excludedUserAgents: ["HeadlessChrome"] }),
      expect.objectContaining({ userAgent: "Mozilla/5.0 HeadlessChrome/120" })
    );
    expect(mocks.recordEvents).not.toHaveBeenCalled();
    expect(reply.sentPayload).toEqual({
      success: true,
      message: "Session replay not recorded - user agent excluded",
    });
  });
});
