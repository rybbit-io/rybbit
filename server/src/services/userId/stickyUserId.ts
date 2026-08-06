import crypto from "crypto";
import { lookupAsn } from "../../db/geolocation/asn.js";
import { identityRedis, stickyResolve } from "../../db/redis/redis.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { isDatacenterAsn } from "../tracker/botBlocking/datacenterAsns.js";

const logger = createServiceLogger("sticky-identity");

// How far back a previous identity counts as a re-attachment candidate.
// Production gap analysis (2026-07-21, ground-truthed against identified_user_id
// switches) showed a same-person, repeated-rotation pattern extending well past
// 5 minutes: the 5-30min bucket has ~5 switches/person, same concentration as
// 0-5min, and 44% of people rotating within 5min also rotate in 5-30min — the
// same phenomenon, not distinct visits. Past 30min the ratio drops to ~1.8
// switches/person (ordinary return-visit churn), matching the 30-minute seen
// TTL below, so 15 minutes captures most of the real recovery without reaching
// into "different visit" territory.
const CANDIDATE_WINDOW_MS = 15 * 60 * 1000;
// How long a fingerprint stays "known" without activity. Matches the session
// TTL so an identity outlives its session by exactly nothing.
const SEEN_TTL_MS = 30 * 60 * 1000;
// How long a re-attachment decision is remembered. Sliding, refreshed on use.
const ALIAS_TTL_MS = 24 * 60 * 60 * 1000;
// Cap on candidate-set size. We only care whether the count is 0 / 1 / many,
// so a small cap bounds memory without ever changing a decision.
const MAX_CANDIDATES = 32;

let stickyIdentityEnabled = process.env.DISABLE_STICKY_IDENTITY !== "true";

export interface StickyIdentityInput {
  siteId: number;
  /** The fingerprint hash generateUserId computed (bucketed IP + UA [+ salt]). */
  rawUserId: string;
  /** The exact client IP — used only for the datacenter-egress eligibility gate. */
  ipAddress: string;
  userAgent: string;
  /**
   * Candidate-pool partition for salted sites (the UTC date the salt was built
   * from). Prevents re-attachment across a salt rotation, which would defeat
   * the salt's cross-day unlinkability. Empty string for unsalted sites.
   */
  saltScope: string;
  nowMs?: number;
  /** Injectable for tests so eligibility can be exercised without the MaxMind DB. */
  isDatacenterEgress?: (ip: string) => boolean;
}

/**
 * Resolve the canonical anonymous user id for a fingerprint hash.
 *
 * Rotating datacenter egress (corporate proxies, WARP, Private Relay) can hand a
 * visitor a new IP outside their /24 bucket mid-visit, minting a phantom user.
 * When a never-seen fingerprint arrives from datacenter egress and exactly one
 * identity with the same user agent was active on this site — through datacenter
 * egress itself — in the last few minutes, re-attach to it; with zero or several
 * candidates, abstain — the failure mode stays "split" (today's behavior),
 * never "merge". Residential visitors are never rotation candidates, so an
 * unrelated home-ISP visitor sharing a common UA can't be merged into.
 *
 * Enhancement layer only: if Redis is unavailable the raw fingerprint is
 * returned immediately and ingestion is never delayed or broken.
 */
export async function resolveStickyUserId(input: StickyIdentityInput): Promise<string> {
  if (!stickyIdentityEnabled || !input.ipAddress || !input.userAgent) {
    return input.rawUserId;
  }
  // Unlike sessions there is no in-process fallback: sticky state is only
  // meaningful when shared across workers, so without Redis we just skip.
  if (identityRedis.status !== "ready") {
    return input.rawUserId;
  }

  const isDatacenterEgress = input.isDatacenterEgress ?? (ip => isDatacenterAsn(lookupAsn(ip)?.asn));
  const uaHash = crypto.createHash("sha256").update(input.userAgent).digest("hex").substring(0, 16);
  const seenKeyPrefix = `sticky:seen:${input.siteId}:`;
  const aliasKeyPrefix = `sticky:alias:${input.siteId}:`;

  try {
    const [userId, outcome] = await stickyResolve({
      seenKey: `${seenKeyPrefix}${input.rawUserId}`,
      candidatesKey: `sticky:cand:${input.siteId}:${input.saltScope}:${uaHash}`,
      aliasKey: `${aliasKeyPrefix}${input.rawUserId}`,
      rawUserId: input.rawUserId,
      nowMs: input.nowMs ?? Date.now(),
      candidateWindowMs: CANDIDATE_WINDOW_MS,
      seenTtlMs: SEEN_TTL_MS,
      aliasTtlMs: ALIAS_TTL_MS,
      eligible: isDatacenterEgress(input.ipAddress),
      seenKeyPrefix,
      aliasKeyPrefix,
      maxCandidates: MAX_CANDIDATES,
    });

    if (outcome === "attach") {
      logger.info(
        { siteId: input.siteId, rawUserId: input.rawUserId, canonicalUserId: userId },
        "Re-attached rotated egress fingerprint to existing identity"
      );
    }
    return userId;
  } catch (error) {
    logger.error({ err: error }, "Sticky identity resolution failed; using raw fingerprint");
    return input.rawUserId;
  }
}

/** Force sticky resolution on/off in tests regardless of env. */
export function setStickyIdentityEnabledForTests(enabled: boolean) {
  stickyIdentityEnabled = enabled;
}
