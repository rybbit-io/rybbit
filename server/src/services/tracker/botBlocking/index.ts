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

export interface BotBlockingResult {
  blocked: true;
  message: string;
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

  // Layer 1: User-agent classification (vendored from isbot patterns, with categories)
  const uaClassification = classifyUA(userAgent);
  if (uaClassification.isBot) {
    logger.info(
      {
        siteId: payload.siteId,
        userAgent,
        cfBotScore,
        botCategory: uaClassification.category,
        matchedPattern: uaClassification.matchedPattern,
      },
      "Bot request filtered (ua-pattern)"
    );
    return {
      blocked: true,
      message: "Event not tracked - bot detected using ua-pattern",
    };
  }

  // Layer 2: Cloudflare Bot Management score forwarded by a request transform or Worker
  if (cloudflareDetection.isBot) {
    logger.info(
      {
        siteId: payload.siteId,
        userAgent,
        cfBotScore,
        reason: cloudflareDetection.reason,
      },
      "Bot request filtered (cloudflare bot score)"
    );
    return {
      blocked: true,
      message: "Event not tracked - bot detected using cloudflare bot score",
    };
  }

  // Layer 3: Header heuristic bot detection
  const detection = detectBot(request, userAgent);
  if (detection.isBot) {
    logger.info(
      { siteId: payload.siteId, userAgent, cfBotScore, reason: detection.reason, score: detection.score },
      "Bot request filtered (heuristics)"
    );
    return {
      blocked: true,
      message: "Event not tracked - bot detected using header heuristics",
    };
  }

  // Layer 4: Client-side bot signal score check
  const clientBotScore = payload.clientBotScore;
  if (typeof clientBotScore === "number" && clientBotScore >= CLIENT_BOT_SCORE_THRESHOLD) {
    logger.info({ siteId: payload.siteId, cfBotScore, clientBotScore }, "Bot request filtered (client signals)");
    return {
      blocked: true,
      message: "Event not tracked - bot detected using client signals",
    };
  }

  // Layer 5: Desktop 800x600 detection — Puppeteer default viewport, near-zero real desktop usage
  if (
    payload.screenWidth === 800 &&
    payload.screenHeight === 600 &&
    userAgent &&
    /Windows NT|Macintosh|X11/.test(userAgent)
  ) {
    logger.info({ siteId: payload.siteId, userAgent, cfBotScore }, "Bot request filtered (desktop 800x600)");
    return {
      blocked: true,
      message: "Event not tracked - bot detected using desktop 800x600",
    };
  }

  // Layer 6: ASN check — IP belongs to hosting/cloud or curated bot provider infrastructure.
  const ipForAsn = payload.ipAddress;
  if (ipForAsn) {
    const asnInfo = lookupAsn(ipForAsn);
    const botAsnMatch = classifyBotAsn(asnInfo?.asn);
    if (asnInfo && botAsnMatch.isBotInfrastructure) {
      logger.info(
        {
          siteId: payload.siteId,
          userAgent,
          cfBotScore,
          ip: ipForAsn,
          asn: asnInfo.asn,
          asnOrg: asnInfo.organization,
          asnSource: botAsnMatch.source,
          asnProvider: botAsnMatch.provider,
          asnCategory: botAsnMatch.category,
          asnNote: botAsnMatch.note,
        },
        "Bot request filtered (bot asn)"
      );
      return {
        blocked: true,
        message: "Event not tracked - bot detected using bot asn",
      };
    }
  }

  return null;
}
