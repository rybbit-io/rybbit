import { FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupAsn } from "../../../db/geolocation/asn.js";
import { resetAnomalyScorerForTests } from "./anomalyScorer.js";
import { getBotDetectionStats, resetBotDetectionStatsForTests } from "./botDetectionStats.js";
import { checkBotBlocking } from "./index.js";

vi.mock("../../../db/geolocation/asn.js", () => ({
  lookupAsn: vi.fn(() => null),
}));

function requestWithHeaders(headers: Record<string, string | string[]>): FastifyRequest {
  return { headers } as unknown as FastifyRequest;
}

const basePayload = {
  siteId: "site_123",
  ipAddress: "203.0.113.10",
};

const browserHeaders = {
  accept: "*/*",
  "accept-encoding": "gzip, br",
  "accept-language": "en-US,en;q=0.9",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
};

const clientBotSignalMasks = {
  automationApi: 1 << 0,
  zeroOuterDimensions: 1 << 1,
  swiftShader: 1 << 3,
};

describe("checkBotBlocking", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    resetBotDetectionStatsForTests();
    vi.mocked(lookupAsn).mockReturnValue(null);
  });

  it("does nothing when bot blocking is disabled", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: false,
      payload: basePayload,
    });

    expect(result).toBeNull();
  });

  it("skips verified trusted server-side ingestion requests", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: true,
      trustedServerSideIngestion: true,
      payload: basePayload,
    });

    expect(result).toBeNull();
  });

  it("does not bypass bot blocking for an unverified bearer header", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({ authorization: "Bearer token" }),
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using header heuristics",
    });
  });

  it("counts requests before bot-blocking bypasses for percentage stats", () => {
    checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: false,
      payload: basePayload,
    });
    checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: true,
      trustedServerSideIngestion: true,
      payload: { ...basePayload, clientBotScore: 0, clientBotSignalMask: 0 },
    });

    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 2,
      totalBotRequests: 0,
      botRequestPercentage: 0,
      clientBotScoreHistogram: {
        missing: 1,
        score0: 1,
      },
      clientBotSignalTotals: {
        missingMask: 1,
      },
    });
  });

  it("returns bot event properties for detected bots", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({}),
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using header heuristics",
      eventProperties: {
        isBot: true,
        detectedHeaderHeuristics: true,
      },
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["header_heuristics"]);
    expect(result?.detections[0]).not.toHaveProperty("message");
    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 1,
      totalBotRequests: 1,
      botRequestPercentage: 100,
      totals: {
        header_heuristics: 1,
      },
      clientBotScoreHistogram: {
        missing: 1,
      },
      clientBotSignalTotals: {
        missingMask: 1,
      },
    });
  });

  it("records client bot score and signal aggregates for inspected requests", () => {
    const request = requestWithHeaders(browserHeaders);

    checkBotBlocking({
      request,
      blockBots: true,
      payload: basePayload,
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 0, clientBotSignalMask: 0 },
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 1, clientBotSignalMask: clientBotSignalMasks.swiftShader },
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 2,
        clientBotSignalMask: clientBotSignalMasks.zeroOuterDimensions,
      },
    });
    checkBotBlocking({
      request,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 3, clientBotSignalMask: clientBotSignalMasks.automationApi },
    });

    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 5,
      totalBotRequests: 1,
      botRequestPercentage: 20,
      clientBotScoreHistogram: {
        missing: 1,
        score0: 1,
        score1: 1,
        score2: 1,
        score3Plus: 1,
      },
      clientBotSignalTotals: {
        missingMask: 1,
        automationApi: 1,
        zeroOuterDimensions: 1,
        missingChrome: 0,
        swiftShader: 1,
        emptyPlugins: 0,
        defaultViewport800x600: 0,
        defaultViewport1024x768: 0,
        impossibleDimensions: 0,
        outerDimensionsWeird: 0,
        pluginApiAbsence: 0,
        unknownMaskBits: 0,
      },
    });
  });

  it("collects every matching bot signal before returning", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      }),
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 3,
        screenWidth: 800,
        screenHeight: 600,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using ua-pattern",
      eventProperties: {
        isBot: true,
        detectedUaPattern: true,
        detectedHeaderHeuristics: true,
        detectedClientSignals: true,
        matchedUaPattern: "headlesschrome",
        botCategory: "headless",
      },
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual([
      "ua_pattern",
      "header_heuristics",
      "client_signals",
    ]);
  });

  it("moves default viewport fingerprints into client signals", () => {
    const result = checkBotBlocking({
      request: requestWithHeaders({
        ...browserHeaders,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
      }),
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 0,
        clientBotSignalMask: 0,
        screenWidth: 1024,
        screenHeight: 768,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using client signals",
      eventProperties: {
        detectedClientSignals: true,
      },
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["client_signals"]);
    expect(result?.detections[0]).toMatchObject({
      clientSignals: ["defaultViewport1024x768"],
    });
  });

  it("does not block generic hosting ASN by itself", () => {
    vi.mocked(lookupAsn).mockReturnValue({
      asn: 16509,
      organization: "Amazon.com, Inc.",
    });

    const result = checkBotBlocking({
      request: requestWithHeaders(browserHeaders),
      blockBots: true,
      payload: {
        ...basePayload,
        ipAddress: "18.0.0.1",
        clientBotScore: 0,
        clientBotSignalMask: 0,
      },
    });

    expect(result).toBeNull();
    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 1,
      totalBotRequests: 0,
      totals: {
        bot_asn: 0,
      },
    });
  });

  it("uses generic hosting ASN as supporting evidence when another layer matched", () => {
    vi.mocked(lookupAsn).mockReturnValue({
      asn: 16509,
      organization: "Amazon.com, Inc.",
    });

    const result = checkBotBlocking({
      request: requestWithHeaders(browserHeaders),
      blockBots: true,
      payload: {
        ...basePayload,
        ipAddress: "18.0.0.1",
        clientBotScore: 3,
        clientBotSignalMask: clientBotSignalMasks.automationApi,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using client signals",
      eventProperties: {
        detectedClientSignals: true,
        detectedBotAsn: true,
        botAsn: 16509,
      },
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["client_signals", "bot_asn"]);
  });

  it("still blocks curated bot provider ASNs without another matched layer", () => {
    vi.mocked(lookupAsn).mockReturnValue({
      asn: 401518,
      organization: "OpenAI, L.L.C.",
    });

    const result = checkBotBlocking({
      request: requestWithHeaders(browserHeaders),
      blockBots: true,
      payload: {
        ...basePayload,
        ipAddress: "57.154.0.1",
        clientBotScore: 0,
        clientBotSignalMask: 0,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using bot asn",
      eventProperties: {
        detectedBotAsn: true,
        botAsn: 401518,
      },
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["bot_asn"]);
  });

  it("adds a rate anomaly layer after a request burst", () => {
    const request = requestWithHeaders(browserHeaders);

    let result: ReturnType<typeof checkBotBlocking> = null;
    for (let i = 0; i < 31; i++) {
      result = checkBotBlocking({
        request,
        blockBots: true,
        payload: {
          ...basePayload,
          clientBotScore: 0,
          hostname: "example.com",
          pathname: "/",
        },
      });
    }

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using rate anomaly",
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["rate_anomaly"]);
    expect(result?.detections[0].anomalyReasons?.map(reason => reason.rule)).toContain("tuple_events_10s");
  });
});
