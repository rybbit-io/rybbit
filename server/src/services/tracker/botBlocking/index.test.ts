import { CLIENT_BOT_SIGNAL_MASKS as clientBotSignalMasks } from "@rybbit/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupAsn } from "../../../db/geolocation/asn.js";
import { resetAnomalyScorerForTests, setRedisAnomalyEnabledForTests } from "./anomalyScorer.js";
import { getBotDetectionStats, resetBotDetectionStatsForTests } from "./botDetectionStats.js";
import { checkBotBlocking } from "./index.js";

vi.mock("../../../db/geolocation/asn.js", () => ({
  lookupAsn: vi.fn(() => null),
}));

// Drive anomaly scoring through the in-process counters so detection is
// deterministic and these tests never touch a real Redis.
vi.mock("../../../db/redis/redis.js", () => ({
  redis: {},
  anomalyObserve: vi.fn(),
}));

const basePayload = {
  siteId: 123,
  ipAddress: "203.0.113.10",
};

const browserHeaders = {
  accept: "*/*",
  "accept-encoding": "gzip, br",
  "accept-language": "en-US,en;q=0.9",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
};

describe("checkBotBlocking", () => {
  beforeEach(() => {
    resetAnomalyScorerForTests();
    setRedisAnomalyEnabledForTests(false);
    resetBotDetectionStatsForTests();
    vi.mocked(lookupAsn).mockReturnValue(null);
  });

  it("still detects when bot blocking is disabled, but does not enforce", async () => {
    const result = await checkBotBlocking({
      headers: {},
      blockBots: false,
      payload: basePayload,
    });

    // The detection is made either way; `enforced` is what changes. A Site that
    // has opted out of blocking used to be skipped before any layer ran, which
    // left it with no record at all of what it was receiving.
    expect(result).toMatchObject({ isBot: true, enforced: false });
  });

  it("marks the same detection as enforced when bot blocking is enabled", async () => {
    const result = await checkBotBlocking({
      headers: {},
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toMatchObject({ isBot: true, enforced: true });
  });

  it("returns null for a clean request whether or not blocking is enabled", async () => {
    for (const blockBots of [true, false]) {
      const result = await checkBotBlocking({
        headers: browserHeaders,
        blockBots,
        payload: { ...basePayload, screenWidth: 1512, screenHeight: 982, clientBotScore: 0, clientBotSignalMask: 0 },
      });

      expect(result).toBeNull();
    }
  });

  it("skips verified trusted server-side ingestion requests", async () => {
    const result = await checkBotBlocking({
      headers: {},
      blockBots: true,
      trustedServerSideIngestion: true,
      payload: basePayload,
    });

    expect(result).toBeNull();
  });

  it("does not bypass bot blocking for an unverified bearer header", async () => {
    const result = await checkBotBlocking({
      headers: { authorization: "Bearer token" },
      blockBots: true,
      payload: basePayload,
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using header heuristics",
    });
  });

  it("counts requests before the trusted-ingestion bypass for percentage stats", async () => {
    await checkBotBlocking({
      headers: {},
      blockBots: true,
      trustedServerSideIngestion: true,
      payload: { ...basePayload, screenWidth: 1512, screenHeight: 982, clientBotScore: 0, clientBotSignalMask: 0 },
    });

    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 1,
      totalBotRequests: 0,
      totalEnforcedBotRequests: 0,
      botRequestPercentage: 0,
      clientBotScoreHistogram: { score0: 1 },
    });
  });

  it("separates what was detected from what was enforced", async () => {
    await checkBotBlocking({ headers: {}, blockBots: true, payload: basePayload });
    await checkBotBlocking({ headers: {}, blockBots: false, payload: basePayload });

    // Detection now runs for every Site, so these two numbers are no longer the
    // same one. The gap is what Sites with blocking disabled are absorbing.
    expect(getBotDetectionStats()).toMatchObject({
      totalRequests: 2,
      totalBotRequests: 2,
      totalEnforcedBotRequests: 1,
    });
  });

  it("records missing screen dimensions without ever convicting on them", async () => {
    const result = await checkBotBlocking({
      headers: browserHeaders,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 0, clientBotSignalMask: 0 },
    });

    // Weight 1 and never strong, so it cannot reach the threshold alone. The
    // point is that a hit reporting no display leaves a trace instead of the
    // geometry rules silently having nothing to say about it.
    expect(result).toBeNull();
    expect(getBotDetectionStats().clientBotSignalTotals.missingScreenDimensions).toBe(1);
  });

  it("does not raise missing screen dimensions for mobile sites", async () => {
    // A native SDK has no screen to report, and is not a bot for it.
    await checkBotBlocking({
      headers: {},
      blockBots: true,
      isMobileSite: true,
      payload: { ...basePayload, clientBotScore: 0, clientBotSignalMask: 0 },
    });

    expect(getBotDetectionStats().clientBotSignalTotals.missingScreenDimensions).toBe(0);
  });

  it("returns bot event properties for detected bots", async () => {
    const result = await checkBotBlocking({
      headers: {},
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

  it("skips browser-shaped layers for mobile sites so native SDK clients are not flagged", async () => {
    // Android React Native ships requests through okhttp with no browser headers.
    // On a web site this trips both the UA-pattern and header-heuristic layers...
    const asWeb = await checkBotBlocking({
      headers: { "user-agent": "okhttp/4.12.0" },
      blockBots: true,
      payload: { ...basePayload, userAgent: "okhttp/4.12.0", clientBotScore: 0, clientBotSignalMask: 0 },
    });
    expect(asWeb).toMatchObject({ isBot: true });

    // ...but a mobile/app site treats it as legitimate first-party traffic.
    const asMobile = await checkBotBlocking({
      headers: { "user-agent": "okhttp/4.12.0" },
      blockBots: true,
      isMobileSite: true,
      payload: { ...basePayload, userAgent: "okhttp/4.12.0", clientBotScore: 0, clientBotSignalMask: 0 },
    });
    expect(asMobile).toBeNull();
  });

  it("still flags mobile traffic through client signals, ASN, and rate anomaly", async () => {
    const result = await checkBotBlocking({
      headers: { "user-agent": "okhttp/4.12.0" },
      blockBots: true,
      isMobileSite: true,
      payload: {
        ...basePayload,
        userAgent: "okhttp/4.12.0",
        clientBotScore: 3,
        clientBotSignalMask: clientBotSignalMasks.automationApi,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using client signals",
    });
    // The browser-shaped layers stay silent; only the native-applicable layer fires.
    expect(result?.detections.map(detection => detection.layer)).toEqual(["client_signals"]);
  });

  it("records client bot score and signal aggregates for inspected requests", async () => {
    const headers = browserHeaders;
    // Plausible dimensions, so the aggregates reflect what the client reported
    // rather than picking up server-inferred geometry signals as well.
    const webPayload = { ...basePayload, screenWidth: 1512, screenHeight: 982 };

    await checkBotBlocking({
      headers,
      blockBots: true,
      payload: webPayload,
    });
    await checkBotBlocking({
      headers,
      blockBots: true,
      payload: { ...webPayload, clientBotScore: 0, clientBotSignalMask: 0 },
    });
    await checkBotBlocking({
      headers,
      blockBots: true,
      payload: { ...webPayload, clientBotScore: 1, clientBotSignalMask: clientBotSignalMasks.swiftShader },
    });
    await checkBotBlocking({
      headers,
      blockBots: true,
      payload: {
        ...webPayload,
        clientBotScore: 2,
        clientBotSignalMask: clientBotSignalMasks.zeroOuterDimensions,
      },
    });
    await checkBotBlocking({
      headers,
      blockBots: true,
      payload: { ...webPayload, clientBotScore: 3, clientBotSignalMask: clientBotSignalMasks.automationApi },
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

  it("collects every matching bot signal before returning", async () => {
    const result = await checkBotBlocking({
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      },
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

  it("moves default viewport fingerprints into client signals", async () => {
    const result = await checkBotBlocking({
      headers: {
        ...browserHeaders,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
      },
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

  it("convicts the 1280x1200 headless window geometry on a desktop UA", async () => {
    const result = await checkBotBlocking({
      headers: {
        ...browserHeaders,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/116 Safari/537.36",
      },
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 0,
        clientBotSignalMask: 0,
        screenWidth: 1280,
        screenHeight: 1200,
      },
    });

    expect(result?.detections.map(detection => detection.layer)).toEqual(["client_signals"]);
    expect(result?.detections[0]).toMatchObject({
      clientSignals: ["defaultViewport1280x1200"],
    });
  });

  it("leaves 1280x1200 alone on a mobile UA, where it is not a headless tell", async () => {
    const result = await checkBotBlocking({
      headers: {
        ...browserHeaders,
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
      },
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 0,
        clientBotSignalMask: 0,
        screenWidth: 1280,
        screenHeight: 1200,
      },
    });

    expect(result).toBeNull();
  });

  it("does not convict on weak client signals alone", async () => {
    // zeroOuterDimensions (2) + swiftShader (1) reaches the score threshold,
    // but both occur on real devices (prerendering, low-end GPUs) — weak
    // signals corroborate, never convict.
    const result = await checkBotBlocking({
      headers: browserHeaders,
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 3,
        clientBotSignalMask: clientBotSignalMasks.zeroOuterDimensions | clientBotSignalMasks.swiftShader,
      },
    });

    expect(result).toBeNull();
  });

  it("does not convict on a client score sent without a signal mask", async () => {
    // Without the mask the score cannot be decomposed into strong vs. weak
    // signals, so it can only ever corroborate.
    const result = await checkBotBlocking({
      headers: browserHeaders,
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 5 },
    });

    expect(result).toBeNull();
  });

  it("uses weak client signals as supporting evidence when another layer matched", async () => {
    const result = await checkBotBlocking({
      headers: {
        ...browserHeaders,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      },
      blockBots: true,
      payload: {
        ...basePayload,
        // Real dimensions, so this stays a test about weak client signals and
        // does not also pick up the missing-dimensions signal.
        screenWidth: 1512,
        screenHeight: 982,
        clientBotScore: 3,
        clientBotSignalMask: clientBotSignalMasks.zeroOuterDimensions | clientBotSignalMasks.swiftShader,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using ua-pattern",
      eventProperties: {
        detectedUaPattern: true,
        detectedClientSignals: true,
        clientBotScore: 3,
        clientSignalMask: clientBotSignalMasks.zeroOuterDimensions | clientBotSignalMasks.swiftShader,
      },
    });
    expect(result?.detections.map(detection => detection.layer)).toContain("client_signals");
  });

  it("does not let two supporting signals convict each other", async () => {
    // Weak client signals + generic hosting ASN are both supporting-only;
    // together they still must not convict.
    vi.mocked(lookupAsn).mockReturnValue({
      asn: 16509,
      organization: "Amazon.com, Inc.",
    });

    const result = await checkBotBlocking({
      headers: browserHeaders,
      blockBots: true,
      payload: {
        ...basePayload,
        ipAddress: "18.0.0.1",
        clientBotScore: 3,
        clientBotSignalMask: clientBotSignalMasks.zeroOuterDimensions | clientBotSignalMasks.swiftShader,
      },
    });

    expect(result).toBeNull();
  });

  it("does not block generic hosting ASN by itself", async () => {
    vi.mocked(lookupAsn).mockReturnValue({
      asn: 16509,
      organization: "Amazon.com, Inc.",
    });

    const result = await checkBotBlocking({
      headers: browserHeaders,
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

  it("uses generic hosting ASN as supporting evidence when another layer matched", async () => {
    vi.mocked(lookupAsn).mockReturnValue({
      asn: 16509,
      organization: "Amazon.com, Inc.",
    });

    const result = await checkBotBlocking({
      headers: browserHeaders,
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

  it("still blocks curated bot provider ASNs without another matched layer", async () => {
    vi.mocked(lookupAsn).mockReturnValue({
      asn: 401518,
      organization: "OpenAI, L.L.C.",
    });

    const result = await checkBotBlocking({
      headers: browserHeaders,
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

  it("adds a rate anomaly layer after a request burst", async () => {
    const headers = browserHeaders;

    let result: Awaited<ReturnType<typeof checkBotBlocking>> = null;
    for (let i = 0; i < 31; i++) {
      result = await checkBotBlocking({
        headers,
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
    // The audit row has to carry which rules fired, not just that the layer
    // did: "rate anomaly" spans a dozen rules, and a row that only records the
    // layer cannot be argued with after the fact.
    expect(result?.eventProperties.anomalyReasons).toContain("tuple_events_10s");
    expect(result?.eventProperties.anomalyScore).toBeGreaterThan(0);
  });

  it("leaves the anomaly audit fields empty when another layer convicted", async () => {
    const userAgent = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

    const result = await checkBotBlocking({
      headers: { ...browserHeaders, "user-agent": userAgent },
      blockBots: true,
      payload: { ...basePayload, userAgent },
    });

    expect(result?.eventProperties).toMatchObject({ anomalyReasons: "", anomalyScore: 0 });
  });

  it("convicts a browser release too old to have run the tracker", async () => {
    const userAgent =
      "Mozilla/5.0 (Linux; Android 8.0; SM-G930F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.0.0 Mobile Safari/537.36";

    const result = await checkBotBlocking({
      headers: { ...browserHeaders, "user-agent": userAgent },
      blockBots: true,
      payload: {
        ...basePayload,
        userAgent,
        clientBotScore: 0,
        clientBotSignalMask: 0,
        screenWidth: 375,
        screenHeight: 812,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using ua-pattern",
      eventProperties: {
        detectedUaPattern: true,
        botCategory: "stale_version",
        matchedUaPattern: "Chrome/40",
      },
    });
    expect(result?.detections.map(detection => detection.layer)).toEqual(["ua_pattern"]);
  });

  it("keeps a stale version from overriding a more specific UA pattern match", async () => {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HeadlessChrome/40.0.0.0 Safari/537.36";

    const result = await checkBotBlocking({
      headers: { ...browserHeaders, "user-agent": userAgent },
      blockBots: true,
      payload: { ...basePayload, userAgent, clientBotScore: 0, clientBotSignalMask: 0 },
    });

    expect(result).toMatchObject({
      eventProperties: { botCategory: "headless", matchedUaPattern: "headlesschrome" },
    });
  });

  it("skips the stale-version rule for mobile sites, where native SDK traffic is not browser-shaped", async () => {
    const userAgent =
      "Mozilla/5.0 (Linux; Android 8.0; SM-G930F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.0.0 Mobile Safari/537.36";

    const result = await checkBotBlocking({
      headers: { ...browserHeaders, "user-agent": userAgent },
      blockBots: true,
      isMobileSite: true,
      payload: { ...basePayload, userAgent, clientBotScore: 0, clientBotSignalMask: 0 },
    });

    expect(result).toBeNull();
  });

  it("convicts a square screen, which no shipping display reports", async () => {
    const result = await checkBotBlocking({
      headers: browserHeaders,
      blockBots: true,
      payload: {
        ...basePayload,
        clientBotScore: 0,
        clientBotSignalMask: 0,
        screenWidth: 2000,
        screenHeight: 2000,
      },
    });

    expect(result).toMatchObject({
      isBot: true,
      message: "Bot detected using client signals",
      eventProperties: { detectedClientSignals: true },
    });
    expect(result?.detections[0]).toMatchObject({ clientSignals: ["squareScreen"] });
  });

  it("convicts a square screen on a mobile UA too", async () => {
    // The square fleets claim Android and iOS as well as desktop, so unlike the
    // default-viewport rules this one is not gated on a desktop user-agent.
    const result = await checkBotBlocking({
      headers: {
        ...browserHeaders,
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
      },
      blockBots: true,
      payload: { ...basePayload, clientBotScore: 0, clientBotSignalMask: 0, screenWidth: 2000, screenHeight: 2000 },
    });

    expect(result?.detections[0]).toMatchObject({ clientSignals: ["squareScreen"] });
  });

  it("convicts screen dimensions outside the range a real display reports", async () => {
    for (const [screenWidth, screenHeight] of [
      [1, 1],
      [16384, 16384],
      [1920, 10000],
    ]) {
      resetBotDetectionStatsForTests();
      const result = await checkBotBlocking({
        headers: browserHeaders,
        blockBots: true,
        payload: { ...basePayload, clientBotScore: 0, clientBotSignalMask: 0, screenWidth, screenHeight },
      });

      expect(result?.detections[0], `${screenWidth}x${screenHeight}`).toMatchObject({
        clientSignals: ["impossibleDimensions"],
      });
    }
  });

  it("leaves real displays at the edges of the plausible range alone", async () => {
    for (const [screenWidth, screenHeight] of [
      [320, 480], // smallest phones
      [7680, 4320], // 8K desktop
      [1920, 1080],
    ]) {
      const result = await checkBotBlocking({
        headers: browserHeaders,
        blockBots: true,
        payload: { ...basePayload, clientBotScore: 0, clientBotSignalMask: 0, screenWidth, screenHeight },
      });

      expect(result, `${screenWidth}x${screenHeight}`).toBeNull();
    }
  });
});
