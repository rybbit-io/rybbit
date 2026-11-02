import {
  CLIENT_BOT_SIGNAL_MASKS,
  getScreenDimensionSignals,
  scoreFromMask,
  STRONG_CLIENT_BOT_SIGNAL_BITS,
} from "@rybbit/shared";
import type { IncomingHttpHeaders } from "http";
import { lookupAsn, type AsnLookup } from "../../db/geolocation/asn.js";
import { classifyBotAsn } from "../tracker/botBlocking/botProviderAsns.js";
import { CLIENT_BOT_SCORE_THRESHOLD } from "../tracker/botBlocking/config.js";
import { detectBot } from "../tracker/botBlocking/headerHeuristics.js";
import { classifyStaleBrowserVersion } from "../tracker/botBlocking/staleBrowserVersion.js";
import { classifyUA } from "../tracker/botBlocking/uaBots/index.js";

export interface ReplayBotCheckInput {
  /** The Site's setting. Off means replays are stored whatever the visitor is. */
  blockBots: boolean;
  /** App/mobile Site: the browser-shaped UA and header layers are skipped. */
  isMobileSite: boolean;
  headers: IncomingHttpHeaders;
  userAgent: string;
  ipAddress: string;
  screenWidth?: number;
  screenHeight?: number;
  /** The tracker's `_bsm`, sent with the batch as it is with events. */
  clientBotSignalMask?: number;
  lookupAsn?: AsnLookup;
}

/**
 * Whether a replay batch comes from a visitor that event ingestion keeps out of
 * `events` as a bot, so its replay should not be stored either.
 *
 * This is `checkBotBlocking`'s decision for the layers that judge a request on
 * its own, with the same rules: user agent (stale browser versions included)
 * and header heuristics on web Sites, strong client signals, and curated
 * bot-provider ASNs. Evidence that only corroborates there (weak client
 * signals, generic hosting ASNs) cannot convict here either.
 *
 * Rate anomaly is left out. Its sliding-window counters are fed by tracked
 * events; counting replay batches would cost a Redis round-trip per batch and
 * push real visitors toward its thresholds. Nothing is recorded to
 * `bot_observations` or the detection stats, which describe `/track` traffic.
 */
export function isBlockedReplayBot(input: ReplayBotCheckInput): boolean {
  if (!input.blockBots) {
    return false;
  }

  const { userAgent } = input;

  if (!input.isMobileSite) {
    if (classifyUA(userAgent).isBot || classifyStaleBrowserVersion(userAgent).isStale) {
      return true;
    }
    if (detectBot(input.headers, userAgent).isBot) {
      return true;
    }
  }

  // Client signals: the screen rules are re-derived from the reported
  // dimensions exactly as for events, then only the strong bits may convict.
  let mask = input.clientBotSignalMask ?? 0;
  if (input.screenWidth !== undefined || input.screenHeight !== undefined) {
    for (const signal of getScreenDimensionSignals(input.screenWidth ?? NaN, input.screenHeight ?? NaN, userAgent)) {
      mask |= CLIENT_BOT_SIGNAL_MASKS[signal];
    }
  }
  if (scoreFromMask(mask & STRONG_CLIENT_BOT_SIGNAL_BITS) >= CLIENT_BOT_SCORE_THRESHOLD) {
    return true;
  }

  if (!input.ipAddress) {
    return false;
  }
  const asnInfo = (input.lookupAsn ?? lookupAsn)(input.ipAddress);
  return classifyBotAsn(asnInfo?.asn).source === "curated_bot_provider";
}
