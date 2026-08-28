import type { FastifyRequest } from "fastify";
import type { ValidatedTrackingPayload } from "./trackingPayload.js";
import { resolveSiteIngestionContext, type SiteIngestionContext } from "./siteIngestionContext.js";

/**
 * One tracking request, fully resolved.
 *
 * Everything downstream of ingestion needs the same handful of facts about a
 * request — who sent it, from where, for which Site — and each of them used to
 * re-derive those facts from the raw `FastifyRequest` on its own. That made the
 * derivations impossible to keep consistent (identity was resolved twice, per
 * different rules) and impossible to test without an HTTP stub.
 *
 * This is that shared value: resolved once at the edge of the handler, then
 * passed by value. It carries no Fastify types, so ingestion can be exercised
 * directly with an object literal.
 */
export interface TrackingRequest extends SiteIngestionContext {
  /** The event body, already validated. */
  payload: ValidatedTrackingPayload;
}

/**
 * Resolve a validated payload and its HTTP request into a Tracking Request.
 *
 * Returns null when the Site is unknown — the only way resolution fails, and
 * the caller's cue to answer 404.
 */
export async function resolveTrackingRequest(
  request: FastifyRequest,
  payload: ValidatedTrackingPayload
): Promise<TrackingRequest | null> {
  const context = await resolveSiteIngestionContext(request, payload);
  if (!context) return null;

  return {
    ...context,
    payload,
  };
}
