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
  /** As it arrived, before self-referrers are cleared for storage. */
  referrer?: string;
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

export interface BotBlockingDetection {
  layer: BotDetectionMethod;
  botCategory?: string | null;
  matchedPattern?: string | null;
  botName?: string | null;
  botOperator?: string | null;
  botPurpose?: string | null;
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
  /**
   * Published identity of the bot, when the matched pattern is one of the
   * curated ones. `matchedUaPattern` is the evidence (a regex source); these
   * are the answer to "who is this and what do they want" — which is the only
   * form in which crawl volume can be attributed to an operator or split into
   * training, answer-engine indexing, and user-triggered agent fetches.
   * Empty for a bot matched only by a generic upstream pattern.
   */
  botName: string;
  botOperator: string;
  botPurpose: string;
  /**
   * Curated provider behind the request's ASN. A user agent can claim any
   * name, so this is the independent half of an attribution claim.
   */
  asnProvider: string;
  clientBotScore?: number;
  clientSignalMask?: number;
  /**
   * Which anomaly rules fired, comma-separated, and what they summed to. The
   * other layers name themselves — a UA pattern or an ASN is its own
   * explanation — but "rate anomaly" covers a dozen rules with very different
   * meanings, and without these an audit row cannot answer why the request was
   * convicted. That question is the entire reason `bot_observations` exists.
   */
  anomalyReasons: string;
  anomalyScore: number;
}

export interface BotDetectionResult {
  isBot: true;
  /**
   * Whether this detection is acted on. Detection and enforcement are separate
   * concerns: every site is evaluated, but only a site with bot blocking on has
   * its bot traffic diverted out of `events`. A detection with `enforced: false`
   * is recorded to `bot_observations` and the event is tracked as normal, so a
   * site that has opted out still produces evidence of what it is receiving.
   */
  enforced: boolean;
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
  const anomalyDetection = detections.find(detection => detection.layer === "rate_anomaly");
  const asnDetection = detections.find(detection => detection.layer === "bot_asn");

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
    botName: uaDetection?.botName ?? "",
    botOperator: uaDetection?.botOperator ?? "",
    botPurpose: uaDetection?.botPurpose ?? "",
    asnProvider: asnDetection?.asnProvider ?? "",
    clientBotScore: clientSignalResult.scoreForStats,
    clientSignalMask: clientSignalResult.maskForStats,
    anomalyReasons: (anomalyDetection?.anomalyReasons ?? []).map(reason => reason.rule).join(","),
    anomalyScore: anomalyDetection?.score ?? 0,
  };
}

function getClientSignalResult(
  payload: BotBlockingPayload,
  userAgent: string,
  hasReportableScreen: boolean
) {
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
  // event that reports no dimensions at all says nothing about its display, so
  // the geometry rules are skipped — but the skip itself is recorded, weakly, so
  // that "no dimensions" is visible in the mask instead of passing silently. It
  // is only raised where a screen was expected: a native SDK and a trusted
  // server-side integration both legitimately have none, and counting them would
  // make the signal useless for reading adoption or confirming a deploy.
  const { screenWidth, screenHeight } = payload;
  if (screenWidth !== undefined || screenHeight !== undefined) {
    for (const signal of getScreenDimensionSignals(screenWidth ?? NaN, screenHeight ?? NaN, userAgent)) {
      addInferredSignal(signal);
    }
  } else if (hasReportableScreen) {
    addInferredSignal("missingScreenDimensions");
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
    hasClientMask,
    hasClientScore,
  };
}

/**
 * Bot detection for trusted server-side ingestion: the user-agent layer alone.
 *
 * The stale-browser-version sub-rule is left out too. It convicts a UA claiming
 * Chrome older than the tracker that reported the hit — sound reasoning for a
 * browser, meaningless for a server relaying someone else's user agent, and it
 * would start convicting traffic that existing API users are sending today.
 *
 * Enforcement is not special-cased: the result goes back as an ordinary
 * detection, so `blockBots` decides its fate exactly as it does for browser
 * traffic and the row lands in `bot_events` or `bot_observations` accordingly.
 */
function classifyTrustedIngestion(
  userAgent: string,
  blockBots: boolean,
  clientSignalResult: ReturnType<typeof getClientSignalResult>
): BotDetectionResult | null {
  const uaClassification = classifyUA(userAgent);
  if (!uaClassification.isBot) {
    return null;
  }

  const detections: BotBlockingDetection[] = [
    {
      layer: "ua_pattern",
      botCategory: uaClassification.category,
      matchedPattern: uaClassification.matchedPattern,
      botName: uaClassification.name,
      botOperator: uaClassification.operator,
      botPurpose: uaClassification.purpose,
    },
  ];

  recordBotDetections(["ua_pattern"], blockBots);

  return {
    isBot: true,
    enforced: blockBots,
    message: "Bot detected using ua-pattern",
    detections,
    // No ASN: the address belongs to the reporting server, not to the bot, so
    // attributing it would be worse than leaving it empty.
    eventProperties: buildBotEventProperties(detections, null, clientSignalResult),
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
  const clientSignalResult = getClientSignalResult(payload, userAgent, !isMobileSite && !trustedServerSideIngestion);
  recordBotBlockingRequest(
    clientSignalResult.scoreForStats,
    clientSignalResult.maskForStats,
    clientSignalResult.hasClientMask,
    clientSignalResult.hasClientScore
  );

  // Trusted server-side ingestion is authenticated first-party traffic that
  // reports its own IP and user agent on someone else's behalf. Four of the
  // five layers are meaningless against it and several would convict it
  // outright: header heuristics read the reporting server's headers, client
  // signals require a browser that never ran, the ASN belongs to whoever is
  // doing the reporting, and rate anomaly would see one origin standing in for
  // its entire audience.
  //
  // The UA layer is the exception, and the only way Rybbit can see a crawler
  // that does not execute JavaScript. `POST /api/track` is the sole ingestion
  // path, so a training crawler that fetches HTML and runs nothing is invisible
  // unless the origin forwards it — and a forwarded `GPTBot` used to land in
  // `events` as a human, because detection was skipped wholesale. Classifying
  // the reported user agent routes it to `bot_events` with full identity
  // instead.
  //
  // `blockBots` deliberately does NOT skip detection. It decides what happens to
  // a detection, not whether one is looked for — a site that has turned blocking
  // off used to get no evaluation at all, which left it with neither protection
  // nor any record of what it was receiving.
  if (trustedServerSideIngestion) {
    return classifyTrustedIngestion(userAgent, blockBots, clientSignalResult);
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
        botName: uaClassification.name,
        botOperator: uaClassification.operator,
        botPurpose: uaClassification.purpose,
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
  let isHostingAsn = false;
  if (ipForAsn) {
    asnInfo = asnLookup(ipForAsn);
    const botAsnMatch = classifyBotAsn(asnInfo?.asn);
    isHostingAsn = asnInfo !== null && botAsnMatch.isBotInfrastructure;
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
    referrer: payload.referrer,
    hasClientBotScore: typeof payload.clientBotScore === "number",
    screenWidth: payload.screenWidth,
    screenHeight: payload.screenHeight,
    language: payload.language,
    isHostingAsn,
    asn: asnInfo?.asn,
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

  recordBotDetections(
    detections.map(detection => detection.layer),
    blockBots
  );

  return {
    isBot: true,
    enforced: blockBots,
    message: blockMessage ?? "Bot detected",
    detections,
    eventProperties: buildBotEventProperties(detections, asnInfo, clientSignalResult),
  };
}
