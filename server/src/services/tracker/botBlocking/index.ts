import { FastifyRequest } from "fastify";
import { lookupAsn } from "../../../db/geolocation/asn.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";
import { classifyBotAsn } from "./botProviderAsns.js";
import { CLIENT_BOT_SCORE_THRESHOLD } from "./config.js";
import { detectBot, detectCloudflareBot } from "./headerHeuristics.js";
import { classifyUA } from "./uaBots/index.js";

const logger = createServiceLogger("bot-blocking");

interface BotBlockingPayload {
  siteId: string;
  userAgent?: string;
  clientBotScore?: number;
  screenWidth?: number;
  screenHeight?: number;
  ipAddress: string;
}

interface BotBlockingInput {
  request: FastifyRequest;
  blockBots: boolean;
  payload: BotBlockingPayload;
}

type BotBlockingLayer =
  | "ua_pattern"
  | "cloudflare_bot_score"
  | "header_heuristics"
  | "client_signals"
  | "desktop_800x600"
  | "bot_asn";

interface BotBlockingDetection {
  layer: BotBlockingLayer;
  message: string;
  botCategory?: string | null;
  matchedPattern?: string | null;
  reason?: string;
  score?: number;
  clientBotScore?: number;
  ip?: string;
  asn?: number;
  asnOrg?: string;
  asnSource?: string;
  asnProvider?: string;
  asnCategory?: string;
  asnNote?: string;
}

export interface BotBlockingResult {
  blocked: true;
  message: string;
  detections: BotBlockingDetection[];
}

function isBearerAuthenticated(request: FastifyRequest): boolean {
  const authHeader = request.headers["authorization"];
  return typeof authHeader === "string" && authHeader.startsWith("Bearer ");
}

export function checkBotBlocking({ request, blockBots, payload }: BotBlockingInput): BotBlockingResult | null {
  if (!blockBots || isBearerAuthenticated(request)) {
    return null;
  }

  const userAgent = payload.userAgent || (request.headers["user-agent"] as string) || "";
  const cloudflareDetection = detectCloudflareBot(request);
  const cfBotScore = cloudflareDetection.score ?? undefined;
  const detections: BotBlockingDetection[] = [];

  // Layer 1: User-agent classification (vendored from isbot patterns, with categories)
  const uaClassification = classifyUA(userAgent);
  if (uaClassification.isBot) {
    detections.push({
      layer: "ua_pattern",
      message: "Event not tracked - bot detected using ua-pattern",
      botCategory: uaClassification.category,
      matchedPattern: uaClassification.matchedPattern,
    });
  }

  // Layer 2: Cloudflare Bot Management score forwarded by a request transform or Worker
  if (cloudflareDetection.isBot) {
    detections.push({
      layer: "cloudflare_bot_score",
      message: "Event not tracked - bot detected using cloudflare bot score",
      reason: cloudflareDetection.reason,
      score: cloudflareDetection.score ?? undefined,
    });
  }

  // Layer 3: Header heuristic bot detection
  const detection = detectBot(request, userAgent);
  if (detection.isBot) {
    detections.push({
      layer: "header_heuristics",
      message: "Event not tracked - bot detected using header heuristics",
      reason: detection.reason,
      score: detection.score,
    });
  }

  // Layer 4: Client-side bot signal score check
  const clientBotScore = payload.clientBotScore;
  if (typeof clientBotScore === "number" && clientBotScore >= CLIENT_BOT_SCORE_THRESHOLD) {
    detections.push({
      layer: "client_signals",
      message: "Event not tracked - bot detected using client signals",
      clientBotScore,
    });
  }

  // Layer 5: Desktop 800x600 detection — Puppeteer default viewport, near-zero real desktop usage
  if (
    payload.screenWidth === 800 &&
    payload.screenHeight === 600 &&
    userAgent &&
    /Windows NT|Macintosh|X11/.test(userAgent)
  ) {
    detections.push({
      layer: "desktop_800x600",
      message: "Event not tracked - bot detected using desktop 800x600",
    });
  }

  // Layer 6: ASN check — IP belongs to hosting/cloud or curated bot provider infrastructure.
  const ipForAsn = payload.ipAddress;
  if (ipForAsn) {
    const asnInfo = lookupAsn(ipForAsn);
    const botAsnMatch = classifyBotAsn(asnInfo?.asn);
    if (asnInfo && botAsnMatch.isBotInfrastructure) {
      detections.push({
        layer: "bot_asn",
        message: "Event not tracked - bot detected using bot asn",
        ip: ipForAsn,
        asn: asnInfo.asn,
        asnOrg: asnInfo.organization,
        asnSource: botAsnMatch.source,
        asnProvider: botAsnMatch.provider,
        asnCategory: botAsnMatch.category,
        asnNote: botAsnMatch.note,
      });
    }
  }

  if (detections.length === 0) {
    return null;
  }

  logger.info(
    {
      siteId: payload.siteId,
      userAgent,
      cfBotScore,
      detectionCount: detections.length,
      detectionLayers: detections.map(detection => detection.layer),
      detections,
    },
    "Bot request filtered"
  );

  return {
    blocked: true,
    message: detections[0].message,
    detections,
  };
}
