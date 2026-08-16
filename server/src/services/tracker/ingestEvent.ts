import { createServiceLogger } from "../../lib/logger/logger.js";
import { sessionsService } from "../sessions/sessionsService.js";
import { decideSiteExclusion, type SiteExclusionDecision } from "../sites/siteExclusionDecision.js";
import { usageService } from "../usageService.js";
import { botEventQueue } from "./botBlocking/botEventQueue.js";
import { checkBotBlocking } from "./botBlocking/index.js";
import { pageviewQueue } from "./pageviewQueue.js";
import type { TrackingRequest } from "./trackingRequest.js";
import { createBasePayload } from "./utils.js";

const logger = createServiceLogger("ingest-event");

type MatchedExclusion = Extract<SiteExclusionDecision, { excluded: true }>;

/**
 * What ingestion did with an event. Every outcome is a success from the
 * caller's point of view — the HTTP layer turns these into status codes and
 * bodies, and holds no ingestion logic of its own.
 */
export type IngestOutcome =
  | { status: "excluded"; exclusion: MatchedExclusion }
  | { status: "over_limit" }
  | { status: "bot" }
  | { status: "tracked"; sessionId: string };

/**
 * Take one resolved Tracking Request through the ingestion pipeline.
 *
 * The order of the stages is the interesting part, and it is the reason this is
 * a module rather than a handler body: each stage can veto, and until they sat
 * together the order was an accident of how the handler had been edited.
 *
 *   1. Site Exclusion Decision — first, so traffic the Site owner has disowned
 *      (their own office IP, a staging hostname) leaves no trace at all. It
 *      used to run third, after bot detection, which meant an excluded visitor
 *      still moved every anomaly counter for the Site.
 *   2. Over-limit — before any Redis or ClickHouse work, since the event is
 *      going to be dropped regardless.
 *   3. Bot detection — needs a real event; charges a Redis round-trip.
 *   4. Identity and session — the only stage that hashes a fingerprint.
 *   5. Enqueue.
 */
export async function ingestEvent(trackingRequest: TrackingRequest): Promise<IngestOutcome> {
  const { payload, site } = trackingRequest;

  const exclusionDecision = await decideSiteExclusion(site, {
    ipAddress: trackingRequest.ipAddress,
    candidateIps: trackingRequest.candidateIps,
    pathname: payload.pathname,
    querystring: payload.querystring,
    hostname: payload.hostname,
    userAgent: trackingRequest.userAgent,
    lookupAsn: trackingRequest.lookupAsn,
  });

  if (exclusionDecision.excluded) {
    logger.info({ siteId: payload.site_id, exclusionReason: exclusionDecision.reason }, "Site exclusion matched");
    return { status: "excluded", exclusion: exclusionDecision };
  }

  if (usageService.isSiteOverLimit(site.siteId)) {
    logger.info({ siteId: payload.site_id }, "Skipping event - site over monthly limit");
    return { status: "over_limit" };
  }

  const botDetectionResult = await checkBotBlocking({
    headers: trackingRequest.headers,
    blockBots: site.blockBots,
    trustedServerSideIngestion: trackingRequest.trustedServerSideIngestion,
    isMobileSite: site.type === "mobile",
    lookupAsn: trackingRequest.lookupAsn,
    payload: {
      siteId: site.siteId,
      userAgent: trackingRequest.userAgent,
      clientBotScore: payload._bs,
      clientBotSignalMask: payload._bsm,
      screenWidth: payload.screenWidth,
      screenHeight: payload.screenHeight,
      language: payload.language,
      hostname: payload.hostname,
      pathname: payload.pathname,
      eventType: payload.type,
      ipAddress: trackingRequest.ipAddress,
    },
  });

  const eventPayload = await createBasePayload(trackingRequest);

  if (botDetectionResult) {
    await botEventQueue.add({
      ...eventPayload,
      ...botDetectionResult.eventProperties,
      sessionId: `bot:${eventPayload.userId}`,
    });

    return { status: "bot" };
  }

  const { sessionId } = await sessionsService.updateSession({
    userId: eventPayload.userId,
    identifiedUserId: eventPayload.identifiedUserId,
    siteId: site.siteId,
  });

  await pageviewQueue.add({
    ...eventPayload,
    sessionId,
  });

  return { status: "tracked", sessionId };
}
