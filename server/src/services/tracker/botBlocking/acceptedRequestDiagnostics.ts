import type { ClientBotSignalName } from "@rybbit/shared";
import { logger } from "../../../lib/logger/logger.js";
import type { BotAsnSource } from "./botProviderAsns.js";

const MAX_DIAGNOSTIC_SITES = 100;
const DIAGNOSTIC_INTERVAL_MS = 60_000;

function configuredSiteIds(value: string | undefined): ReadonlySet<number> {
  if (!value?.trim()) return new Set();

  const entries = value.split(",").map(entry => entry.trim());
  if (entries.length > MAX_DIAGNOSTIC_SITES) return new Set();

  const siteIds = new Set<number>();
  for (const entry of entries) {
    const siteId = Number(entry);
    // An invalid allowlist disables diagnostics rather than widening its scope.
    if (!/^[1-9]\d*$/.test(entry) || !Number.isSafeInteger(siteId)) return new Set();
    siteIds.add(siteId);
  }
  return siteIds;
}

// Startup-only operator configuration; an empty allowlist keeps the feature off.
const siteIds = configuredSiteIds(process.env.BOT_DIAGNOSTIC_SITE_IDS);
// Only configured IDs enter this map, so it is bounded without a cleanup timer.
const lastLoggedAt = new Map<number, number>();

interface AcceptedRequestDiagnostic {
  siteId: number;
  blockBots: boolean;
  score: number;
  strongScore: number;
  signalMask: number;
  signals: readonly ClientBotSignalName[];
  hasClientScore: boolean;
  hasClientMask: boolean;
  asn?: number;
  asnSource?: BotAsnSource;
}

/** Sample decisions, not requests: never pass raw headers, identities or routes to the logger. */
export function recordAcceptedRequestDiagnostic(input: AcceptedRequestDiagnostic): void {
  if (!siteIds.has(input.siteId)) return;

  const now = performance.now();
  const previous = lastLoggedAt.get(input.siteId);
  if (previous !== undefined && now - previous < DIAGNOSTIC_INTERVAL_MS) return;
  lastLoggedAt.set(input.siteId, now);

  try {
    logger.info(
      {
        event: "bot_detection_accepted_diagnostic",
        siteId: input.siteId,
        decision: "not_classified_as_bot",
        reason: "supporting_signals_only",
        blockBots: input.blockBots,
        score: input.score,
        strongScore: input.strongScore,
        signalMask: input.signalMask,
        signals: input.signals,
        hasClientScore: input.hasClientScore,
        hasClientMask: input.hasClientMask,
        asn: input.asn ?? null,
        asnSource: input.asnSource ?? "unclassified",
      },
      "Bot detection accepted request with supporting client signals"
    );
  } catch {
    // Optional diagnostics must never change the ingestion outcome, even if a log sink fails.
  }
}
