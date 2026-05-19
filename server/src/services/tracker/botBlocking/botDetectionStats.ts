import { logger } from "../../../lib/logger/logger.js";

export type BotDetectionMethod =
  | "ua_pattern"
  | "header_heuristics"
  | "client_signals"
  | "desktop_800x600"
  | "bot_asn"
  | "rate_anomaly";

const BOT_DETECTION_METHODS: readonly BotDetectionMethod[] = [
  "ua_pattern",
  "header_heuristics",
  "client_signals",
  "desktop_800x600",
  "bot_asn",
  "rate_anomaly",
];

const totals: Record<BotDetectionMethod, number> = {
  ua_pattern: 0,
  header_heuristics: 0,
  client_signals: 0,
  desktop_800x600: 0,
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

let totalRequests = 0;
let totalBlockedRequests = 0;

function getBotRequestPercentage() {
  if (totalRequests === 0) {
    return 0;
  }
  return Number(((totalBlockedRequests / totalRequests) * 100).toFixed(2));
}

export function recordBotBlockingRequest(clientBotScore: number | undefined) {
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
}

export function recordBotDetections(methods: readonly BotDetectionMethod[]) {
  totalBlockedRequests++;
  for (const method of methods) {
    totals[method]++;
  }
}

export function getBotDetectionStats() {
  return {
    totalRequests,
    totalBlockedRequests,
    botRequestPercentage: getBotRequestPercentage(),
    totals: { ...totals },
    clientBotScoreHistogram: { ...clientBotScoreHistogram },
  };
}

export function resetBotDetectionStatsForTests() {
  totalRequests = 0;
  totalBlockedRequests = 0;
  for (const method of BOT_DETECTION_METHODS) {
    totals[method] = 0;
  }
  clientBotScoreHistogram.missing = 0;
  clientBotScoreHistogram.score0 = 0;
  clientBotScoreHistogram.score1 = 0;
  clientBotScoreHistogram.score2 = 0;
  clientBotScoreHistogram.score3Plus = 0;
}

const interval = setInterval(() => {
  logger.info(
    {
      totalRequests,
      totalBlockedRequests,
      botRequestPercentage: getBotRequestPercentage(),
      botDetectionTotals: { ...totals },
      clientBotScoreHistogram: { ...clientBotScoreHistogram },
    },
    "Bot detection totals since server start"
  );
}, 5_000);

interval.unref?.();
