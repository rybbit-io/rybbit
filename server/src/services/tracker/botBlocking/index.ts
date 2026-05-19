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

export interface BotBlockingDetection {
  layer: BotDetectionMethod;
  botCategory?: string | null;
  matchedPattern?: string | null;
  reason?: string;
  score?: number;
  clientBotScore?: number;
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
  detectedDesktop800x600: boolean;
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
    detectedDesktop800x600: detectionLayers.has("desktop_800x600"),
    detectedBotAsn: detectionLayers.has("bot_asn"),
    detectedRateAnomaly: detectionLayers.has("rate_anomaly"),
    matchedUaPattern: uaDetection?.matchedPattern ?? "",
    botCategory: uaDetection?.botCategory ?? "",
  };
}

export function checkBotBlocking({
  request,
  blockBots,
  trustedServerSideIngestion = false,
  payload,
}: BotBlockingInput): BotDetectionResult | null {
  const clientBotScore = payload.clientBotScore;
  recordBotBlockingRequest(clientBotScore, payload.clientBotSignalMask);

  if (!blockBots || trustedServerSideIngestion) {
    return null;
  }

  const userAgent = payload.userAgent || (request.headers["user-agent"] as string) || "";
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

  // Layer 3: Client-side bot signal score check
  if (typeof clientBotScore === "number" && clientBotScore >= CLIENT_BOT_SCORE_THRESHOLD) {
    addDetection("Bot detected using client signals", {
      layer: "client_signals",
      clientBotScore,
    });
  }

  // Layer 4: Desktop 800x600 detection — Puppeteer default viewport, near-zero real desktop usage
  if (
    payload.screenWidth === 800 &&
    payload.screenHeight === 600 &&
    userAgent &&
    /Windows NT|Macintosh|X11/.test(userAgent)
  ) {
    addDetection("Bot detected using desktop 800x600", {
      layer: "desktop_800x600",
    });
  }

  // Layer 5: ASN check — IP belongs to hosting/cloud or curated bot provider infrastructure.
  const ipForAsn = payload.ipAddress;
  let asnInfo: AsnInfo | null = null;
  if (ipForAsn) {
    asnInfo = lookupAsn(ipForAsn);
    const botAsnMatch = classifyBotAsn(asnInfo?.asn);
    if (asnInfo && botAsnMatch.isBotInfrastructure) {
      addDetection("Bot detected using bot asn", {
        layer: "bot_asn",
        ip: ipForAsn,
        asn: asnInfo.asn,
        asnOrg: asnInfo.organization,
        asnProvider: botAsnMatch.provider,
        asnCategory: botAsnMatch.category,
        asnNote: botAsnMatch.note,
      });
    }
  }

  // Layer 6: Request-rate and crawl-shape anomaly detection.
  const anomaly = observeTrackingAnomaly({
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

  if (detections.length === 0) {
    return null;
  }

  logger.info(
    {
      siteId: payload.siteId,
      detectionCount: detections.length,
      detectionLayers: detections.map(detection => detection.layer),
      detections,
    },
    "Bot request detected"
  );

  recordBotDetections(detections.map(detection => detection.layer));

  return {
    isBot: true,
    message: blockMessage ?? "Bot detected",
    detections,
    eventProperties: buildBotEventProperties(detections, asnInfo),
  };
}
