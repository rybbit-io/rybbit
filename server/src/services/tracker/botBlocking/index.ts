import type { IncomingHttpHeaders } from "http";
import { lookupAsn, type AsnInfo, type AsnLookup } from "../../../db/geolocation/asn.js";
import { logger } from "../../../lib/logger/logger.js";
import type { AnomalyCounters } from "./anomalyScorer.js";
import { observeTrackingAnomaly } from "./anomalyScorer.js";
import type { BotDetectionMethod } from "./botDetectionStats.js";
import { recordBotBlockingRequest, recordBotDetections } from "./botDetectionStats.js";
import { classifyBotAsn } from "./botProviderAsns.js";
import { CLIENT_BOT_SCORE_THRESHOLD } from "./config.js";
import { detectBot } from "./headerHeuristics.js";
import { classifyStaleBrowserVersion } from "./staleBrowserVersion.js";
import { classifyUA } from "./uaBots/index.js";

// Per-detection logging is verbose and costly at high traffic; off by default.
const LOG_BOT_DETECTIONS = false;

interface BotBlockingPayload {
  siteId: string;
  userAgent?: string;
  clientBotScore?: number;
  clientBotSignalMask?: number;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  hostname?: string;
  pathname?: string;
  eventType?: string;
  ipAddress: string;
}

interface BotBlockingInput {
  /**
   * The request's headers. Header heuristics are the only thing this needs from
   * the HTTP request, so it takes headers rather than a `FastifyRequest` —
   * ingestion can then be driven from a plain value.
   */
  headers: IncomingHttpHeaders;
  blockBots: boolean;
  trustedServerSideIngestion?: boolean;
  /**
   * App/mobile site. The UA-pattern and header-heuristic layers are
   * browser-shaped and produce false positives for native SDK traffic, so they
   * are skipped for mobile sites (see checkBotBlocking).
   */
  isMobileSite?: boolean;
  payload: BotBlockingPayload;
  /** Request-scoped ASN resolver, shared with the rest of the ingestion path. */
  lookupAsn?: AsnLookup;
}

interface AnomalyReason {
  rule: string;
  score: number;
  value: number;
  threshold: number;
  windowSeconds: number;
}

const CLIENT_SIGNAL_MASKS = {
  automationApi: 1 << 0,
  zeroOuterDimensions: 1 << 1,
  missingChrome: 1 << 2,
  swiftShader: 1 << 3,
  emptyPlugins: 1 << 4,
  defaultViewport800x600: 1 << 5,
  defaultViewport1024x768: 1 << 6,
  impossibleDimensions: 1 << 7,
  outerDimensionsWeird: 1 << 8,
  pluginApiAbsence: 1 << 9,
  defaultViewport1280x1200: 1 << 10,
  squareScreen: 1 << 11,
} as const;

type ClientSignalName = keyof typeof CLIENT_SIGNAL_MASKS;

// Must mirror the weights in analytics-script/botSignals.ts — the client sends
// one cached score, and the server recomputes it from the signal mask to split
// it into convicting vs. corroborating evidence.
const CLIENT_SIGNAL_WEIGHTS: Record<ClientSignalName, number> = {
  automationApi: 3,
  zeroOuterDimensions: 2,
  missingChrome: 1,
  swiftShader: 1,
  emptyPlugins: 1,
  defaultViewport800x600: 3,
  defaultViewport1024x768: 3,
  impossibleDimensions: 3,
  outerDimensionsWeird: 2,
  pluginApiAbsence: 0,
  defaultViewport1280x1200: 3,
  squareScreen: 3,
};

// Signals that are automation-specific enough to convict on their own. The
// remaining (weak) signals — empty plugins, SwiftShader, zero outer dimensions,
// missing window.chrome — all occur on real devices (Android Chrome ships empty
// plugins; low-end GPUs fall back to SwiftShader; prerendered pages report zero
// outer dimensions), so they corroborate other layers but never convict.
const STRONG_CLIENT_SIGNAL_BITS =
  CLIENT_SIGNAL_MASKS.automationApi |
  CLIENT_SIGNAL_MASKS.impossibleDimensions |
  CLIENT_SIGNAL_MASKS.defaultViewport800x600 |
  CLIENT_SIGNAL_MASKS.defaultViewport1024x768 |
  CLIENT_SIGNAL_MASKS.defaultViewport1280x1200 |
  CLIENT_SIGNAL_MASKS.squareScreen;

function sumClientSignalWeights(mask: number): number {
  return Object.entries(CLIENT_SIGNAL_MASKS).reduce(
    (total, [name, bit]) => ((mask & bit) !== 0 ? total + CLIENT_SIGNAL_WEIGHTS[name as ClientSignalName] : total),
    0
  );
}

export interface BotBlockingDetection {
  layer: BotDetectionMethod;
  botCategory?: string | null;
  matchedPattern?: string | null;
  reason?: string;
  score?: number;
  clientBotScore?: number;
  clientBotSignalMask?: number;
  clientSignals?: ClientSignalName[];
  ip?: string;
  asn?: number;
  asnOrg?: string;
  asnProvider?: string;
  asnCategory?: string;
  asnNote?: string;
  anomalyReasons?: AnomalyReason[];
  anomalyCounters?: AnomalyCounters;
}

export interface BotEventProperties {
  isBot: true;
  botAsn?: number;
  botAsnOrg?: string;
  detectedUaPattern: boolean;
  detectedHeaderHeuristics: boolean;
  detectedClientSignals: boolean;
  detectedBotAsn: boolean;
  detectedRateAnomaly: boolean;
  matchedUaPattern: string;
  botCategory: string;
  clientBotScore?: number;
  clientSignalMask?: number;
}

export interface BotDetectionResult {
  isBot: true;
  message: string;
  detections: BotBlockingDetection[];
  eventProperties: BotEventProperties;
}

function buildBotEventProperties(
  detections: BotBlockingDetection[],
  asnInfo: AsnInfo | null,
  clientSignalResult: ReturnType<typeof getClientSignalResult>
): BotEventProperties {
  const detectionLayers = new Set(detections.map(detection => detection.layer));
  const uaDetection = detections.find(detection => detection.layer === "ua_pattern");

  return {
    isBot: true,
    botAsn: asnInfo?.asn,
    botAsnOrg: asnInfo?.organization ?? "",
    detectedUaPattern: detectionLayers.has("ua_pattern"),
    detectedHeaderHeuristics: detectionLayers.has("header_heuristics"),
    detectedClientSignals: detectionLayers.has("client_signals"),
    detectedBotAsn: detectionLayers.has("bot_asn"),
    detectedRateAnomaly: detectionLayers.has("rate_anomaly"),
    matchedUaPattern: uaDetection?.matchedPattern ?? "",
    botCategory: uaDetection?.botCategory ?? "",
    clientBotScore: clientSignalResult.scoreForStats,
    clientSignalMask: clientSignalResult.maskForStats,
  };
}

function isFiniteDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Mirrors MIN/MAX_PLAUSIBLE_SCREEN_DIMENSION in analytics-script/botSignals.ts.
// The payload carries screen.width/height — the physical display, not the
// window — so no amount of resizing or zoom moves a real value outside these.
const MIN_PLAUSIBLE_SCREEN_DIMENSION = 200;
const MAX_PLAUSIBLE_SCREEN_DIMENSION = 8192;

function isPlausibleScreenDimensions(width: unknown, height: unknown): boolean {
  return (
    isFiniteDimension(width) &&
    isFiniteDimension(height) &&
    width >= MIN_PLAUSIBLE_SCREEN_DIMENSION &&
    height >= MIN_PLAUSIBLE_SCREEN_DIMENSION &&
    width <= MAX_PLAUSIBLE_SCREEN_DIMENSION &&
    height <= MAX_PLAUSIBLE_SCREEN_DIMENSION
  );
}

function isDesktopUserAgent(userAgent: string) {
  return /Windows NT|Macintosh|X11|Linux x86_64/.test(userAgent) && !/Mobile|Android|iPhone|iPad/.test(userAgent);
}

function getClientSignalNames(mask: number): ClientSignalName[] {
  return Object.entries(CLIENT_SIGNAL_MASKS).flatMap(([name, bit]) =>
    (mask & bit) !== 0 ? [name as ClientSignalName] : []
  );
}

function getClientSignalResult(payload: BotBlockingPayload, userAgent: string) {
  const hasClientScore = typeof payload.clientBotScore === "number" && Number.isFinite(payload.clientBotScore);
  const hasClientMask = typeof payload.clientBotSignalMask === "number" && Number.isFinite(payload.clientBotSignalMask);
  const rawMask = hasClientMask ? payload.clientBotSignalMask! : 0;
  let mask = rawMask;
  let inferredScore = 0;

  function addInferredSignal(name: ClientSignalName, weight: number) {
    const bit = CLIENT_SIGNAL_MASKS[name];
    if ((mask & bit) === 0) {
      mask |= bit;
    }

    if (!hasClientScore || (rawMask & bit) === 0) {
      inferredScore += weight;
    }
  }

  // Re-derived server-side rather than trusted from the client mask, so the
  // rules apply to every hit regardless of which tracker version sent it.
  const { screenWidth, screenHeight } = payload;
  const hasScreenDimensions = screenWidth !== undefined || screenHeight !== undefined;
  if (hasScreenDimensions && !isPlausibleScreenDimensions(screenWidth, screenHeight)) {
    addInferredSignal("impossibleDimensions", 3);
  } else if (isFiniteDimension(screenWidth) && isFiniteDimension(screenHeight)) {
    // No shipping display is square; every square value in production traffic
    // is a renderer default (2000x2000, 1024x1024, 1280x1280, 1366x1366).
    // Not gated on a desktop UA — the square fleets also claim Android and iOS.
    if (screenWidth === screenHeight) {
      addInferredSignal("squareScreen", 3);
    }

    if (isDesktopUserAgent(userAgent)) {
      if (screenWidth === 800 && screenHeight === 600) {
        addInferredSignal("defaultViewport800x600", 3);
      }
      if (screenWidth === 1024 && screenHeight === 768) {
        addInferredSignal("defaultViewport1024x768", 3);
      }
      if (screenWidth === 1280 && screenHeight === 1200) {
        addInferredSignal("defaultViewport1280x1200", 3);
      }
    }
  }

  const score = Math.min((hasClientScore ? payload.clientBotScore! : 0) + inferredScore, 10);

  // Score contributed by strong (convicting) signals only. Derived from the
  // mask, not the client's opaque score — a score sent without a mask cannot be
  // decomposed, so it can only ever corroborate.
  const strongScore = sumClientSignalWeights(mask & STRONG_CLIENT_SIGNAL_BITS);

  return {
    score,
    strongScore,
    mask,
    signalNames: getClientSignalNames(mask),
    scoreForStats: hasClientScore || inferredScore > 0 ? score : undefined,
    maskForStats: hasClientMask || mask !== 0 ? mask : undefined,
  };
}

export async function checkBotBlocking({
  headers,
  blockBots,
  trustedServerSideIngestion = false,
  isMobileSite = false,
  payload,
  lookupAsn: asnLookup = lookupAsn,
}: BotBlockingInput): Promise<BotDetectionResult | null> {
  const userAgent = payload.userAgent || (headers["user-agent"] as string) || "";
  const clientSignalResult = getClientSignalResult(payload, userAgent);
  recordBotBlockingRequest(clientSignalResult.scoreForStats, clientSignalResult.maskForStats);

  if (!blockBots || trustedServerSideIngestion) {
    return null;
  }

  const detections: BotBlockingDetection[] = [];
  let blockMessage: string | null = null;

  function addDetection(message: string, detection: BotBlockingDetection) {
    blockMessage ??= message;
    detections.push(detection);
  }

  // Layers 1 and 2 are browser-shaped: they flag native HTTP clients (okhttp,
  // CFNetwork, Cronet) as scripting frameworks and treat the absence of
  // browser-only headers (Accept-Language, sec-fetch-*) as suspicious. A
  // first-party mobile SDK legitimately looks exactly like that, so skip these
  // layers for app/mobile sites and rely on the client-signal, ASN, and
  // rate-anomaly layers below, which apply equally to native traffic.
  if (!isMobileSite) {
    // Layer 1: User-agent classification (vendored from isbot patterns, with categories)
    const uaClassification = classifyUA(userAgent);
    if (uaClassification.isBot) {
      addDetection("Bot detected using ua-pattern", {
        layer: "ua_pattern",
        botCategory: uaClassification.category,
        matchedPattern: uaClassification.matchedPattern,
      });
    } else {
      // Layer 1b: a browser release too old to have run the tracker that
      // reported the hit. Shares the ua_pattern layer so it lands in the
      // existing bot_category/matched_ua_pattern columns for auditing.
      const staleBrowser = classifyStaleBrowserVersion(userAgent);
      if (staleBrowser.isStale) {
        addDetection("Bot detected using ua-pattern", {
          layer: "ua_pattern",
          botCategory: "stale_version",
          matchedPattern: staleBrowser.matchedVersion,
        });
      }
    }

    // Layer 2: Header heuristic bot detection
    const detection = detectBot(headers, userAgent);
    if (detection.isBot) {
      addDetection("Bot detected using header heuristics", {
        layer: "header_heuristics",
        reason: detection.reason,
        score: detection.score,
      });
    }
  }

  // Layer 3: Client-side and client-derived bot signal score check. Only
  // strong signals convict on their own; weak signals reaching the threshold
  // (or a score the client sent without a mask) corroborate other layers but
  // never convict, mirroring the generic-hosting-ASN rule below.
  let supportingClientSignalDetection: BotBlockingDetection | null = null;
  if (Math.max(clientSignalResult.score, clientSignalResult.strongScore) >= CLIENT_BOT_SCORE_THRESHOLD) {
    const clientSignalDetection: BotBlockingDetection = {
      layer: "client_signals",
      clientBotScore: clientSignalResult.score,
      clientBotSignalMask: clientSignalResult.mask,
      clientSignals: clientSignalResult.signalNames,
    };

    if (clientSignalResult.strongScore >= CLIENT_BOT_SCORE_THRESHOLD) {
      addDetection("Bot detected using client signals", clientSignalDetection);
    } else {
      supportingClientSignalDetection = clientSignalDetection;
    }
  }

  // Layer 4: ASN check — IP belongs to hosting/cloud or curated bot provider infrastructure.
  const ipForAsn = payload.ipAddress;
  let asnInfo: AsnInfo | null = null;
  let supportingHostingAsnDetection: BotBlockingDetection | null = null;
  if (ipForAsn) {
    asnInfo = asnLookup(ipForAsn);
    const botAsnMatch = classifyBotAsn(asnInfo?.asn);
    if (asnInfo && botAsnMatch.isBotInfrastructure) {
      const asnDetection: BotBlockingDetection = {
        layer: "bot_asn",
        ip: ipForAsn,
        asn: asnInfo.asn,
        asnOrg: asnInfo.organization,
        asnProvider: botAsnMatch.provider,
        asnCategory: botAsnMatch.category,
        asnNote: botAsnMatch.note,
      };

      if (botAsnMatch.source === "curated_bot_provider") {
        addDetection("Bot detected using bot asn", asnDetection);
      } else {
        supportingHostingAsnDetection = asnDetection;
      }
    }
  }

  // Layer 5: Request-rate and crawl-shape anomaly detection.
  const anomaly = await observeTrackingAnomaly({
    siteId: payload.siteId,
    ipAddress: payload.ipAddress,
    userAgent,
    hostname: payload.hostname,
    pathname: payload.pathname,
    eventType: payload.eventType,
    hasClientBotScore: typeof payload.clientBotScore === "number",
    screenWidth: payload.screenWidth,
    screenHeight: payload.screenHeight,
    language: payload.language,
  });
  if (anomaly.isAnomalous) {
    addDetection("Bot detected using rate anomaly", {
      layer: "rate_anomaly",
      score: anomaly.score,
      anomalyReasons: anomaly.reasons,
      anomalyCounters: anomaly.counters,
    });
  }

  // Supporting evidence attaches only when a convicting layer already fired —
  // two supporting signals must not convict each other.
  const hasConvictingDetection = detections.length > 0;
  if (hasConvictingDetection && supportingClientSignalDetection) {
    addDetection("Bot detected using client signals", supportingClientSignalDetection);
  }
  if (hasConvictingDetection && supportingHostingAsnDetection) {
    addDetection("Bot detected using bot asn", supportingHostingAsnDetection);
  }

  if (detections.length === 0) {
    return null;
  }

  if (LOG_BOT_DETECTIONS) {
    logger.info(
      {
        siteId: payload.siteId,
        detectionCount: detections.length,
        detectionLayers: detections.map(detection => detection.layer),
        detections,
      },
      "Bot request detected"
    );
  }

  recordBotDetections(detections.map(detection => detection.layer));

  return {
    isBot: true,
    message: blockMessage ?? "Bot detected",
    detections,
    eventProperties: buildBotEventProperties(detections, asnInfo, clientSignalResult),
  };
}
