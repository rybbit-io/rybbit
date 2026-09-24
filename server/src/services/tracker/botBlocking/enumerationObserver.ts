import { redis } from "../../../db/redis/redis.js";
import { createServiceLogger } from "../../../lib/logger/logger.js";

/**
 * The enumeration observer — shadow mode.
 *
 * A distributed crawler that walks a site's URL space leaves no per-visitor
 * evidence: it paces itself under every rate threshold, sends one well-formed
 * event per identity, and runs a real browser. Nothing in the per-request layers
 * can see it. What it cannot hide is the *shape* of what a cohort requests: it
 * enumerates permutations, so nearly every path it asks for is one nobody has
 * asked for before, and it burns a fresh identity per hit.
 *
 * That shape is measured here, per (cohort, 15-minute bucket):
 *
 *   path novelty      distinct paths / events        — enumeration, not reading
 *   events per actor  events / distinct actors       — an identity per request
 *   direct share      events with no referrer        — arrived at, not navigated to
 *
 * Two properties keep this honest. First, it is an aggregate statement — it
 * describes a cohort, not the request in front of us — so it is recorded and
 * never convicts. `observeEnumeration` returns an observation; no caller turns
 * it into a score. Promoting it later is a deliberate act, informed by what
 * shadow mode collects, not a threshold nudge.
 *
 * Second, a cohort must qualify in two consecutive buckets before it is marked,
 * which filters a one-off migration crawl or sitemap ping.
 *
 * The direct share is measured on the RAW referrer, before self-referrers are
 * cleared for storage. A stored empty referrer means "direct or internal
 * navigation", which is a different and far more common thing — measuring the
 * stored value would put most ordinary browsing above the threshold.
 *
 * Two known weaknesses, recorded because they are the reason this is not a rule
 * yet and must be resolved before it becomes one:
 *
 *   1. The streak is evaluated against the CURRENT bucket's running counters,
 *      not a closed one. A cohort that qualifies transiently early in a bucket
 *      stays marked even if the full bucket would not have qualified, and 300
 *      events either side of a bucket boundary reads as "sustained" on two
 *      seconds of traffic. Promotion needs closed-bucket evaluation.
 *   2. The direct share does not separate a crawler from a genuinely direct
 *      campaign. Email, in-app and messenger traffic arrives with no referrer
 *      on personalized one-hit-per-recipient URLs — the crawler's shape in every
 *      measured respect. Only UTM-tagged campaigns are distinguishable today,
 *      and only because they tend to be referred, which is not something to rely
 *      on.
 */

const logger = createServiceLogger("enumeration-observer");

export const ENUMERATION_BUCKET_MS = 15 * 60 * 1000;

/**
 * Gates, set well outside anything organic traffic produces. The crawler that
 * motivated them ran at 0.96 novelty and 1.17 events per actor sustained over
 * hours; a busy content site sits near 0.02 novelty with several events per
 * visitor. The volume floor keeps small cohorts — where these ratios are noise —
 * out of it entirely.
 */
const MIN_EVENTS = 300;
const MIN_PATH_NOVELTY = 0.9;
const MAX_EVENTS_PER_ACTOR = 1.25;
const MIN_DIRECT_SHARE = 0.98;

/** Raw counter readings for one cohort's current bucket. */
export interface EnumerationReading {
  events: number;
  distinctPaths: number;
  distinctActors: number;
  directEvents: number;
}

export interface EnumerationObservation {
  /** This bucket meets every gate. */
  qualifies: boolean;
  /** This bucket and the one before it both qualified. */
  sustained: boolean;
  pathNovelty: number;
  eventsPerActor: number;
  directShare: number;
  events: number;
}

// Mirrors the Redis streak markers for when Redis is unavailable, one entry per
// (cohort, bucket) exactly as Redis holds one key per (cohort, bucket). Storing
// only the latest bucket per cohort would not do: every later hit in the same
// bucket would then read its own marker back and see no streak. Bounded because
// a cohort only lands here after clearing the volume and shape gates, which
// almost nothing does.
const localQualifiedBuckets = new Set<string>();
const MAX_LOCAL_STREAK_ENTRIES = 1024;

/**
 * The streak verdict for each (cohort, bucket) this process has already
 * resolved. Without it the cost of observing scales with the crawler: a cohort
 * qualifies at its 300th event, and every event after that in the same bucket
 * would repeat the round-trip and re-log the same finding — thousands of both,
 * on exactly the traffic being measured. The marker only needs writing once, so
 * resolve once per bucket and serve the answer from here afterwards.
 */
const resolvedBuckets = new Map<string, boolean>();
const MAX_RESOLVED_BUCKETS = 1024;

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function evaluateEnumerationReading(reading: EnumerationReading) {
  const pathNovelty = ratio(reading.distinctPaths, reading.events);
  const eventsPerActor = ratio(reading.events, reading.distinctActors);
  const directShare = ratio(reading.directEvents, reading.events);

  const qualifies =
    reading.events >= MIN_EVENTS &&
    pathNovelty >= MIN_PATH_NOVELTY &&
    // An actor count above the event count is not meaningful; HyperLogLog is
    // approximate, so this can happen by a hair on small buckets.
    eventsPerActor > 0 &&
    eventsPerActor <= MAX_EVENTS_PER_ACTOR &&
    directShare >= MIN_DIRECT_SHARE;

  return { qualifies, pathNovelty, eventsPerActor, directShare, events: reading.events };
}

function markLocally(cohortKey: string, bucket: number): boolean {
  const previousQualified = localQualifiedBuckets.has(`${cohortKey}:${bucket - 1}`);
  if (localQualifiedBuckets.size >= MAX_LOCAL_STREAK_ENTRIES) {
    localQualifiedBuckets.clear();
  }
  localQualifiedBuckets.add(`${cohortKey}:${bucket}`);
  return previousQualified;
}

/**
 * Record that this bucket qualified and report whether the previous one did too.
 * Resolved at most once per (cohort, bucket) per process — see `resolvedBuckets`
 * — so the extra round-trip is charged per qualifying bucket, not per event in
 * one.
 *
 * `useLocalState` follows whichever backend the counters themselves used. Going
 * to Redis for the marker while the counters are in-process would mean paying a
 * connection timeout on every qualifying bucket during an outage, which is the
 * moment the hot path can least afford it.
 */
async function resolveStreak(cohortKey: string, bucket: number, useLocalState: boolean): Promise<boolean> {
  const bucketKey = `${cohortKey}:${bucket}`;
  const resolved = resolvedBuckets.get(bucketKey);
  if (resolved !== undefined) {
    return resolved;
  }

  let sustained: boolean;
  if (useLocalState) {
    sustained = markLocally(cohortKey, bucket);
  } else {
    try {
      const results = await redis
        .multi()
        .set(`bot:enum:q:${bucketKey}`, "1", "PX", ENUMERATION_BUCKET_MS * 3)
        .exists(`bot:enum:q:${cohortKey}:${bucket - 1}`)
        .exec();

      // `exec` returns [error, value] pairs in command order; the second is ours.
      sustained = results?.[1]?.[1] === 1;
    } catch (error) {
      logger.error({ err: error }, "Enumeration streak check failed; using in-process fallback");
      // The marker for the previous bucket may only exist in Redis, so a streak
      // spanning an outage is lost. Shadow mode tolerates that; it under-reports
      // rather than inventing a finding.
      sustained = markLocally(cohortKey, bucket);
    }
  }

  if (resolvedBuckets.size >= MAX_RESOLVED_BUCKETS) {
    resolvedBuckets.clear();
  }
  resolvedBuckets.set(bucketKey, sustained);
  return sustained;
}

/**
 * Evaluate one cohort bucket. Returns null when the cohort's counters were not
 * collected (no cohort dimensions, or no path to measure novelty against).
 */
export async function observeEnumeration(
  cohortKey: string,
  bucket: number,
  reading: EnumerationReading,
  useLocalState = false
): Promise<EnumerationObservation | null> {
  const evaluated = evaluateEnumerationReading(reading);
  if (!evaluated.qualifies) {
    return { ...evaluated, sustained: false };
  }

  const alreadyResolved = resolvedBuckets.has(`${cohortKey}:${bucket}`);
  const sustained = await resolveStreak(cohortKey, bucket, useLocalState);

  if (sustained && !alreadyResolved) {
    // The only output of shadow mode. It is deliberately a log line and not a
    // score: promoting this rule should follow from reading these, not from it
    // having quietly been convicting all along.
    logger.warn(
      {
        cohortKey,
        bucket,
        events: evaluated.events,
        pathNovelty: Number(evaluated.pathNovelty.toFixed(3)),
        eventsPerActor: Number(evaluated.eventsPerActor.toFixed(3)),
        directShare: Number(evaluated.directShare.toFixed(3)),
      },
      "Enumeration cohort sustained across two buckets (shadow mode, not enforced)"
    );
  }

  return { ...evaluated, sustained };
}

export function resetEnumerationObserverForTests() {
  localQualifiedBuckets.clear();
  resolvedBuckets.clear();
}
