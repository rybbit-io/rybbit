import { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordSessionReplayRequest } from "../../types/sessionReplay.js";
import { recordSessionReplay } from "./recordSessionReplay.js";

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isIPExcluded: vi.fn(),
  isCountryExcluded: vi.fn(),
  isPathExcluded: vi.fn(),
  isHostnameExcluded: vi.fn(),
  isUserAgentExcluded: vi.fn(),
  isSiteOverLimit: vi.fn(),
  isSiteWithoutReplay: vi.fn(),
  getLocation: vi.fn(),
  recordEvents: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("../../lib/siteConfig.js", () => ({
  siteConfig: {
    getConfig: mocks.getConfig,
    isIPExcluded: mocks.isIPExcluded,
    isCountryExcluded: mocks.isCountryExcluded,
    isPathExcluded: mocks.isPathExcluded,
    isHostnameExcluded: mocks.isHostnameExcluded,
    isUserAgentExcluded: mocks.isUserAgentExcluded,
  },
}));

vi.mock("../../services/usageService.js", () => ({
  usageService: {
    isSiteOverLimit: mocks.isSiteOverLimit,
    isSiteWithoutReplay: mocks.isSiteWithoutReplay,
  },
}));

vi.mock("../../db/geolocation/geolocation.js", () => ({
  getLocation: mocks.getLocation,
}));

vi.mock("../../services/replay/sessionReplayIngestService.js", () => ({
  SessionReplayIngestService: vi.fn().mockImplementation(() => ({
    recordEvents: mocks.recordEvents,
  })),
}));

vi.mock("../../lib/logger/logger.js", () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
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
    mocks.isIPExcluded.mockResolvedValue(false);
    mocks.isCountryExcluded.mockResolvedValue(false);
    mocks.isPathExcluded.mockResolvedValue(false);
    mocks.isHostnameExcluded.mockResolvedValue(false);
    mocks.isUserAgentExcluded.mockResolvedValue(false);
    mocks.isSiteOverLimit.mockReturnValue(false);
    mocks.isSiteWithoutReplay.mockReturnValue(false);
    mocks.getLocation.mockResolvedValue({});
    mocks.recordEvents.mockResolvedValue(undefined);
  });

  it("uses the shared IP exclusion matcher before recording replay batches", async () => {
    mocks.getConfig.mockResolvedValue({
      ...baseConfig,
      excludedIPs: ["198.51.100.0/24"],
    });
    mocks.isIPExcluded.mockResolvedValue(true);

    const reply = createReply();
    await recordSessionReplay(createRequest(), reply);

    expect(mocks.isIPExcluded).toHaveBeenCalledWith("198.51.100.10", "site_abc");
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
    mocks.isPathExcluded.mockResolvedValue(true);

    const reply = createReply();
    await recordSessionReplay(createRequest(), reply);

    expect(mocks.isPathExcluded).toHaveBeenCalledWith("/admin/users", "site_abc");
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
    mocks.isHostnameExcluded.mockResolvedValue(true);

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

    expect(mocks.isHostnameExcluded).toHaveBeenCalledWith("preview.vercel.app", "site_abc");
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
    mocks.isUserAgentExcluded.mockResolvedValue(true);

    const reply = createReply();
    await recordSessionReplay(createRequest(), reply);

    expect(mocks.isUserAgentExcluded).toHaveBeenCalledWith("Mozilla/5.0 HeadlessChrome/120", "site_abc");
    expect(mocks.recordEvents).not.toHaveBeenCalled();
    expect(reply.sentPayload).toEqual({
      success: true,
      message: "Session replay not recorded - user agent excluded",
    });
  });
});
