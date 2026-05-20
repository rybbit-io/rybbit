import { logger } from "../../../lib/logger/logger.js";

export type BotDetectionMethod = "ua_pattern" | "header_heuristics" | "client_signals" | "bot_asn" | "rate_anomaly";

const BOT_DETECTION_METHODS: readonly BotDetectionMethod[] = [
  "ua_pattern",
  "header_heuristics",
  "client_signals",
  "bot_asn",
  "rate_anomaly",
];

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

let totalRequests = 0;
let totalBotRequests = 0;

function getBotRequestPercentage() {
  if (totalRequests === 0) {
    return 0;
  }
  return Number(((totalBotRequests / totalRequests) * 100).toFixed(2));
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
  clientBotScoreHistogram.missing = 0;
  clientBotScoreHistogram.score0 = 0;
  clientBotScoreHistogram.score1 = 0;
  clientBotScoreHistogram.score2 = 0;
  clientBotScoreHistogram.score3Plus = 0;
  clientBotSignalTotals.missingMask = 0;
  clientBotSignalTotals.automationApi = 0;
  clientBotSignalTotals.zeroOuterDimensions = 0;
  clientBotSignalTotals.missingChrome = 0;
  clientBotSignalTotals.swiftShader = 0;
  clientBotSignalTotals.emptyPlugins = 0;
  clientBotSignalTotals.defaultViewport800x600 = 0;
  clientBotSignalTotals.defaultViewport1024x768 = 0;
  clientBotSignalTotals.impossibleDimensions = 0;
  clientBotSignalTotals.outerDimensionsWeird = 0;
  clientBotSignalTotals.pluginApiAbsence = 0;
  clientBotSignalTotals.unknownMaskBits = 0;
}

const interval = setInterval(() => {
  logger.info(
    {
      totalRequests,
      totalBotRequests,
      botRequestPercentage: getBotRequestPercentage(),
      botDetectionTotals: { ...totals },
      clientBotScoreHistogram: { ...clientBotScoreHistogram },
      clientBotSignalTotals: { ...clientBotSignalTotals },
    },
    "Bot detection totals since server start"
  );
}, 5_000);

interval.unref?.();
