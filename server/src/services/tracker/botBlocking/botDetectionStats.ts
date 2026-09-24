import {
  ALL_CLIENT_BOT_SIGNAL_BITS,
  CLIENT_BOT_SIGNAL_MASKS,
  CLIENT_BOT_SIGNAL_NAMES,
  ClientBotSignalName,
} from "@rybbit/shared";
import { redis } from "../../../db/redis/redis.js";
import { logger } from "../../../lib/logger/logger.js";

export type BotDetectionMethod = "ua_pattern" | "header_heuristics" | "client_signals" | "bot_asn" | "rate_anomaly";

const BOT_DETECTION_METHODS: readonly BotDetectionMethod[] = [
  "ua_pattern",
  "header_heuristics",
  "client_signals",
  "bot_asn",
  "rate_anomaly",
];

const BOT_DETECTION_STATS_INTERVAL_MS = 60_000;

// Counters are incremented in-process on the hot path (no per-event Redis), then
// flushed as deltas into a shared hash once per interval so the logged totals are
// cluster-wide rather than one fragmented slice per worker.
const STATS_HASH_KEY = "bot:stats";
// Single-logger election: whichever worker wins this short-lived lock logs the
// aggregate for the interval, so the cluster emits one line instead of N.
const STATS_LOG_LOCK_KEY = "bot:stats:loglock";
const STATS_LOG_LOCK_TTL_MS = BOT_DETECTION_STATS_INTERVAL_MS - 5_000;

const totals: Record<BotDetectionMethod, number> = {
  ua_pattern: 0,
  header_heuristics: 0,
  client_signals: 0,
  bot_asn: 0,
  rate_anomaly: 0,
};

const clientBotScoreHistogram = {
  missing: 0,
  score0: 0,
  score1: 0,
  score2: 0,
  score3Plus: 0,
};

// One counter per signal the Bot Signal contract defines, plus two for masks we
// cannot label: absent, and carrying bits from a contract newer than this
// build. Labels are derived from the contract rather than transcribed, so a new
// signal starts being counted the moment it is added there.
type ClientBotSignalTotal = ClientBotSignalName | "missingMask" | "unknownMaskBits";

const clientBotSignalTotals: Record<ClientBotSignalTotal, number> = {
  missingMask: 0,
  unknownMaskBits: 0,
  ...(Object.fromEntries(CLIENT_BOT_SIGNAL_NAMES.map(name => [name, 0])) as Record<ClientBotSignalName, number>),
};

// Canonical field sets, captured once, used to round-trip counters through the
// flat Redis hash.
const HISTOGRAM_KEYS = Object.keys(clientBotScoreHistogram) as (keyof typeof clientBotScoreHistogram)[];
const SIGNAL_KEYS = Object.keys(clientBotSignalTotals) as ClientBotSignalTotal[];

let totalRequests = 0;
let totalBotRequests = 0;
let totalEnforcedBotRequests = 0;

function getBotRequestPercentage(requests = totalRequests, botRequests = totalBotRequests) {
  if (requests === 0) {
    return 0;
  }
  return Number(((botRequests / requests) * 100).toFixed(2));
}

/**
 * `hasClientScore`/`hasClientMask` are whether the CLIENT reported them, which
 * is a different question from whether we have them: the server infers signals
 * of its own, so a request from a tracker too old to report anything can still
 * arrive here with a score and a mask. These two counters measure tracker
 * adoption, so they follow the client.
 *
 * The histogram still partitions every request, but its buckets mean two
 * different things by design: `missing` is "the client reported nothing", while
 * the numbered buckets hold the score we ended up with, inferred contributions
 * included. The per-signal totals follow the same rule — they count every bit we
 * ended up with, which is what makes a new bit appearing in production the proof
 * that a deploy actually took.
 */
export function recordBotBlockingRequest(
  clientBotScore: number | undefined,
  clientBotSignalMask: number | undefined,
  hasClientMask = clientBotSignalMask !== undefined,
  hasClientScore = clientBotScore !== undefined
) {
  totalRequests++;

  if (!hasClientScore || typeof clientBotScore !== "number" || !Number.isFinite(clientBotScore)) {
    clientBotScoreHistogram.missing++;
  } else if (clientBotScore === 0) {
    clientBotScoreHistogram.score0++;
  } else if (clientBotScore === 1) {
    clientBotScoreHistogram.score1++;
  } else if (clientBotScore === 2) {
    clientBotScoreHistogram.score2++;
  } else {
    clientBotScoreHistogram.score3Plus++;
  }

  if (!hasClientMask) {
    clientBotSignalTotals.missingMask++;
  }

  if (typeof clientBotSignalMask === "number" && Number.isFinite(clientBotSignalMask)) {
    for (const name of CLIENT_BOT_SIGNAL_NAMES) {
      if ((clientBotSignalMask & CLIENT_BOT_SIGNAL_MASKS[name]) !== 0) {
        clientBotSignalTotals[name]++;
      }
    }

    if ((clientBotSignalMask & ~ALL_CLIENT_BOT_SIGNAL_BITS) !== 0) {
      clientBotSignalTotals.unknownMaskBits++;
    }
  }
}

/**
 * `enforced` is whether the detection was acted on. Detection now runs for every
 * site, including those with bot blocking turned off, so the detection totals
 * and the blocked total are no longer the same number: `totalBotRequests`
 * counts what was detected, `totalEnforcedBotRequests` the subset that was
 * actually diverted out of `events`. The gap between them is what sites with
 * blocking disabled are absorbing.
 */
export function recordBotDetections(methods: readonly BotDetectionMethod[], enforced: boolean) {
  totalBotRequests++;
  if (enforced) {
    totalEnforcedBotRequests++;
  }
  for (const method of methods) {
    totals[method]++;
  }
}

export function getBotDetectionStats() {
  return {
    totalRequests,
    totalBotRequests,
    totalEnforcedBotRequests,
    botRequestPercentage: getBotRequestPercentage(),
    totals: { ...totals },
    clientBotScoreHistogram: { ...clientBotScoreHistogram },
    clientBotSignalTotals: { ...clientBotSignalTotals },
  };
}

export function resetBotDetectionStatsForTests() {
  totalRequests = 0;
  totalBotRequests = 0;
  totalEnforcedBotRequests = 0;
  for (const method of BOT_DETECTION_METHODS) {
    totals[method] = 0;
  }
  for (const key of HISTOGRAM_KEYS) {
    clientBotScoreHistogram[key] = 0;
  }
  for (const key of SIGNAL_KEYS) {
    clientBotSignalTotals[key] = 0;
  }
  lastFlushed = {};
}

// Flatten the in-process counters to the hash field names used in Redis.
function flattenLocalCounters(): Record<string, number> {
  const flat: Record<string, number> = {
    totalRequests,
    totalBotRequests,
    totalEnforcedBotRequests,
  };
  for (const method of BOT_DETECTION_METHODS) {
    flat[`m:${method}`] = totals[method];
  }
  for (const key of HISTOGRAM_KEYS) {
    flat[`cs:${key}`] = clientBotScoreHistogram[key];
  }
  for (const key of SIGNAL_KEYS) {
    flat[`sig:${key}`] = clientBotSignalTotals[key];
  }
  return flat;
}

// Reassemble a hash read from Redis into the structured shape we log.
function structureAggregate(hash: Record<string, string>) {
  const num = (field: string) => Number(hash[field] ?? 0) || 0;

  const aggregateTotals = {} as Record<BotDetectionMethod, number>;
  for (const method of BOT_DETECTION_METHODS) {
    aggregateTotals[method] = num(`m:${method}`);
  }

  const histogram = {} as Record<keyof typeof clientBotScoreHistogram, number>;
  for (const key of HISTOGRAM_KEYS) {
    histogram[key] = num(`cs:${key}`);
  }

  const signalTotals = {} as Record<ClientBotSignalTotal, number>;
  for (const key of SIGNAL_KEYS) {
    signalTotals[key] = num(`sig:${key}`);
  }

  const requests = num("totalRequests");
  const botRequests = num("totalBotRequests");

  return {
    totalRequests: requests,
    totalBotRequests: botRequests,
    totalEnforcedBotRequests: num("totalEnforcedBotRequests"),
    botRequestPercentage: getBotRequestPercentage(requests, botRequests),
    botDetectionTotals: aggregateTotals,
    clientBotScoreHistogram: histogram,
    clientBotSignalTotals: signalTotals,
  };
}

// Tracks what we've already pushed to Redis so each flush only sends the delta
// since the last flush.
let lastFlushed: Record<string, number> = {};
let flushing = false;

/**
 * Flush the in-process counter deltas into the shared Redis hash and, if this
 * process wins the per-interval lock, log the cluster-wide aggregate. Safe to
 * call concurrently (re-entrant calls are ignored) and never throws.
 */
export async function flushBotDetectionStats(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const current = flattenLocalCounters();

    const pipeline = redis.pipeline();
    let hasDelta = false;
    for (const [field, value] of Object.entries(current)) {
      const delta = value - (lastFlushed[field] ?? 0);
      if (delta !== 0) {
        pipeline.hincrby(STATS_HASH_KEY, field, delta);
        hasDelta = true;
      }
    }
    if (hasDelta) {
      await pipeline.exec();
    }
    lastFlushed = current;

    // Only the worker that wins the lock logs, so the cluster emits one
    // aggregated line per interval instead of one per worker.
    const acquired = await redis.set(STATS_LOG_LOCK_KEY, "1", "PX", STATS_LOG_LOCK_TTL_MS, "NX");
    if (acquired) {
      const hash = await redis.hgetall(STATS_HASH_KEY);
      logger.info(structureAggregate(hash), "Bot detection totals (cluster, cumulative)");
    }
  } catch (error) {
    // Redis aggregation unavailable — don't go dark. Log this process's local
    // totals so observability degrades gracefully rather than disappearing.
    logger.warn(
      { err: error as Error, ...getBotDetectionStats() },
      "Bot detection totals (local; Redis aggregation unavailable)"
    );
  } finally {
    flushing = false;
  }
}

const interval = setInterval(() => {
  void flushBotDetectionStats();
}, BOT_DETECTION_STATS_INTERVAL_MS);

interval.unref?.();
