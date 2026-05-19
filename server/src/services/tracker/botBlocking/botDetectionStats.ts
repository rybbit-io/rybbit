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

let totalBlockedRequests = 0;

export function recordBotDetections(methods: readonly BotDetectionMethod[]) {
  totalBlockedRequests++;
  for (const method of methods) {
    totals[method]++;
  }
}

export function getBotDetectionStats() {
  return {
    totalBlockedRequests,
    totals: { ...totals },
  };
}

export function resetBotDetectionStatsForTests() {
  totalBlockedRequests = 0;
  for (const method of BOT_DETECTION_METHODS) {
    totals[method] = 0;
  }
}

const interval = setInterval(() => {
  logger.info(
    {
      totalBlockedRequests,
      botDetectionTotals: { ...totals },
    },
    "Bot detection totals since server start"
  );
}, 5_000);

interval.unref?.();
