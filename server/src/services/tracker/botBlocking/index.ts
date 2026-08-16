import {
  CLIENT_BOT_SIGNAL_MASKS,
  CLIENT_BOT_SIGNAL_WEIGHTS,
  ClientBotSignalName,
  getClientBotSignalNames,
  getScreenDimensionSignals,
  MAX_CLIENT_BOT_SCORE,
  scoreFromMask,
  STRONG_CLIENT_BOT_SIGNAL_BITS,
} from "@rybbit/shared";
import { FastifyRequest } from "fastify";
import { lookupAsn, type AsnInfo } from "../../../db/geolocation/asn.js";
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
  /** Numeric Site id — the one ingestion uses everywhere else. */
  siteId: number;
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
  request: FastifyRequest;
  blockBots: boolean;
  trustedServerSideIngestion?: boolean;
  /**
   * App/mobile site. The UA-pattern and header-heuristic layers are
   * browser-shaped and produce false positives for native SDK traffic, so they
   * are skipped for mobile sites (see checkBotBlocking).
   */
  isMobileSite?: boolean;
  payload: BotBlockingPayload;
}

interface AnomalyReason {
  rule: string;
  score: number;
  value: number;
  threshold: number;
  windowSeconds: number;
}

export interface BotBlockingDetection {
  layer: BotDetectionMethod;
  botCategory?: string | null;
  matchedPattern?: string | null;
  reason?: string;
  score?: number;
  clientBotScore?: number;
  clientBotSignalMask?: number;
  clientSignals?: ClientBotSignalName[];
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

function getClientSignalResult(payload: BotBlockingPayload, userAgent: string) {
  const hasClientScore = typeof payload.clientBotScore === "number" && Number.isFinite(payload.clientBotScore);
  const hasClientMask = typeof payload.clientBotSignalMask === "number" && Number.isFinite(payload.clientBotSignalMask);
  const rawMask = hasClientMask ? payload.clientBotSignalMask! : 0;
  let mask = rawMask;
  let inferredScore = 0;

  function addInferredSignal(name: ClientBotSignalName) {
    const bit = CLIENT_BOT_SIGNAL_MASKS[name];
    if ((mask & bit) === 0) {
      mask |= bit;
    }

    if (!hasClientScore || (rawMask & bit) === 0) {
      inferredScore += CLIENT_BOT_SIGNAL_WEIGHTS[name];
    }
  }

  // Re-derived server-side rather than trusted from the client mask, so the
  // rules apply to every hit regardless of which tracker version sent it. An
  // event that reports no dimensions at all says nothing about its display.
  const { screenWidth, screenHeight } = payload;
  if (screenWidth !== undefined || screenHeight !== undefined) {
    for (const signal of getScreenDimensionSignals(screenWidth ?? NaN, screenHeight ?? NaN, userAgent)) {
      addInferredSignal(signal);
    }
  }

  const score = Math.min((hasClientScore ? payload.clientBotScore! : 0) + inferredScore, MAX_CLIENT_BOT_SCORE);

  // Score contributed by strong (convicting) signals only. Derived from the
  // mask, not the client's opaque score — a score sent without a mask cannot be
  // decomposed, so it can only ever corroborate.
  const strongScore = scoreFromMask(mask & STRONG_CLIENT_BOT_SIGNAL_BITS);

  return {
    score,
    strongScore,
    mask,
    signalNames: getClientBotSignalNames(mask),
    scoreForStats: hasClientScore || inferredScore > 0 ? score : undefined,
    maskForStats: hasClientMask || mask !== 0 ? mask : undefined,
  };
}

export async function checkBotBlocking({
  request,
  blockBots,
  trustedServerSideIngestion = false,
  isMobileSite = false,
  payload,
}: BotBlockingInput): Promise<BotDetectionResult | null> {
  const userAgent = payload.userAgent || (request.headers["user-agent"] as string) || "";
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
    const detection = detectBot(request, userAgent);
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
    asnInfo = lookupAsn(ipForAsn);
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
