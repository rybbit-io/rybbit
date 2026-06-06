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

const CLIENT_BOT_SIGNAL_COMPONENTS = [
  ["automationApi", 1 << 0],
  ["zeroOuterDimensions", 1 << 1],
  ["missingChrome", 1 << 2],
  ["swiftShader", 1 << 3],
  ["emptyPlugins", 1 << 4],
  ["defaultViewport800x600", 1 << 5],
  ["defaultViewport1024x768", 1 << 6],
  ["impossibleDimensions", 1 << 7],
  ["outerDimensionsWeird", 1 << 8],
  ["pluginApiAbsence", 1 << 9],
] as const;

type ClientBotSignalComponent = (typeof CLIENT_BOT_SIGNAL_COMPONENTS)[number][0];
type ClientBotSignalTotal = ClientBotSignalComponent | "missingMask" | "unknownMaskBits";

const KNOWN_CLIENT_BOT_SIGNAL_MASK = CLIENT_BOT_SIGNAL_COMPONENTS.reduce((mask, [, bit]) => mask | bit, 0);

const clientBotSignalTotals: Record<ClientBotSignalTotal, number> = {
  missingMask: 0,
  automationApi: 0,
  zeroOuterDimensions: 0,
  missingChrome: 0,
  swiftShader: 0,
  emptyPlugins: 0,
  defaultViewport800x600: 0,
  defaultViewport1024x768: 0,
  impossibleDimensions: 0,
  outerDimensionsWeird: 0,
  pluginApiAbsence: 0,
  unknownMaskBits: 0,
};

// Canonical field sets, captured once, used to round-trip counters through the
// flat Redis hash.
const HISTOGRAM_KEYS = Object.keys(clientBotScoreHistogram) as (keyof typeof clientBotScoreHistogram)[];
const SIGNAL_KEYS = Object.keys(clientBotSignalTotals) as ClientBotSignalTotal[];

let totalRequests = 0;
let totalBotRequests = 0;

function getBotRequestPercentage(requests = totalRequests, botRequests = totalBotRequests) {
  if (requests === 0) {
    return 0;
  }
  return Number(((botRequests / requests) * 100).toFixed(2));
}

export function recordBotBlockingRequest(clientBotScore: number | undefined, clientBotSignalMask: number | undefined) {
  totalRequests++;

  if (typeof clientBotScore !== "number" || !Number.isFinite(clientBotScore)) {
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

  if (typeof clientBotSignalMask !== "number" || !Number.isFinite(clientBotSignalMask)) {
    clientBotSignalTotals.missingMask++;
  } else {
    for (const [component, bit] of CLIENT_BOT_SIGNAL_COMPONENTS) {
      if ((clientBotSignalMask & bit) !== 0) {
        clientBotSignalTotals[component]++;
      }
    }

    if ((clientBotSignalMask & ~KNOWN_CLIENT_BOT_SIGNAL_MASK) !== 0) {
      clientBotSignalTotals.unknownMaskBits++;
    }
  }
}

export function recordBotDetections(methods: readonly BotDetectionMethod[]) {
  totalBotRequests++;
  for (const method of methods) {
    totals[method]++;
  }
}

export function getBotDetectionStats() {
  return {
    totalRequests,
    totalBotRequests,
    botRequestPercentage: getBotRequestPercentage(),
    totals: { ...totals },
    clientBotScoreHistogram: { ...clientBotScoreHistogram },
    clientBotSignalTotals: { ...clientBotSignalTotals },
  };
}

export function resetBotDetectionStatsForTests() {
  totalRequests = 0;
  totalBotRequests = 0;
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
