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
  hostname?: string;
  pathname?: string;
  eventType?: string;
  ipAddress: string;
}

interface BotBlockingInput {
  request: FastifyRequest;
  blockBots: boolean;
  trustedServerSideIngestion?: boolean;
  payload: BotBlockingPayload;
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
} as const;

type ClientSignalName = keyof typeof CLIENT_SIGNAL_MASKS;

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
}

export interface BotDetectionResult {
  isBot: true;
  message: string;
  detections: BotBlockingDetection[];
  eventProperties: BotEventProperties;
}

function buildBotEventProperties(detections: BotBlockingDetection[], asnInfo: AsnInfo | null): BotEventProperties {
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
  };
}

function isFiniteDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

  const { screenWidth, screenHeight } = payload;
  const hasScreenDimensions = screenWidth !== undefined || screenHeight !== undefined;
  if (
    hasScreenDimensions &&
    (!isFiniteDimension(screenWidth) ||
      !isFiniteDimension(screenHeight) ||
      screenWidth <= 0 ||
      screenHeight <= 0 ||
      screenWidth > 100000 ||
      screenHeight > 100000)
  ) {
    addInferredSignal("impossibleDimensions", 3);
  } else if (isFiniteDimension(screenWidth) && isFiniteDimension(screenHeight) && isDesktopUserAgent(userAgent)) {
    if (screenWidth === 800 && screenHeight === 600) {
      addInferredSignal("defaultViewport800x600", 3);
    }
    if (screenWidth === 1024 && screenHeight === 768) {
      addInferredSignal("defaultViewport1024x768", 3);
    }
  }

  const score = Math.min((hasClientScore ? payload.clientBotScore! : 0) + inferredScore, 10);

  return {
    score,
    mask,
    signalNames: getClientSignalNames(mask),
    scoreForStats: hasClientScore || inferredScore > 0 ? score : undefined,
    maskForStats: hasClientMask || mask !== 0 ? mask : undefined,
  };
}

export async function checkBotBlocking({
  request,
  blockBots,
  trustedServerSideIngestion = false,
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

  // Layer 1: User-agent classification (vendored from isbot patterns, with categories)
  const uaClassification = classifyUA(userAgent);
  if (uaClassification.isBot) {
    addDetection("Bot detected using ua-pattern", {
      layer: "ua_pattern",
      botCategory: uaClassification.category,
      matchedPattern: uaClassification.matchedPattern,
    });
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

  // Layer 3: Client-side and client-derived bot signal score check
  if (clientSignalResult.score >= CLIENT_BOT_SCORE_THRESHOLD) {
    addDetection("Bot detected using client signals", {
      layer: "client_signals",
      clientBotScore: clientSignalResult.score,
      clientBotSignalMask: clientSignalResult.mask,
      clientSignals: clientSignalResult.signalNames,
    });
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
  });
  if (anomaly.isAnomalous) {
    addDetection("Bot detected using rate anomaly", {
      layer: "rate_anomaly",
      score: anomaly.score,
      anomalyReasons: anomaly.reasons,
      anomalyCounters: anomaly.counters,
    });
  }

  if (supportingHostingAsnDetection && detections.length > 0) {
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
    eventProperties: buildBotEventProperties(detections, asnInfo),
  };
}
