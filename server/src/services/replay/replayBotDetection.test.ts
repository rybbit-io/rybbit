import { CLIENT_BOT_SIGNAL_MASKS } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { isBlockedReplayBot, type ReplayBotCheckInput } from "./replayBotDetection.js";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const browser: ReplayBotCheckInput = {
  blockBots: true,
  isMobileSite: false,
  headers: {
    "user-agent": CHROME_UA,
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    "sec-fetch-site": "cross-site",
    "sec-fetch-mode": "cors",
  },
  userAgent: CHROME_UA,
  ipAddress: "198.51.100.10",
  screenWidth: 1920,
  screenHeight: 1080,
  lookupAsn: () => null,
};

describe("isBlockedReplayBot", () => {
  it("passes an ordinary browser", () => {
    expect(isBlockedReplayBot(browser)).toBe(false);
  });

  it("never blocks when the Site doesn't block bots", () => {
    expect(isBlockedReplayBot({ ...browser, blockBots: false, userAgent: "GPTBot/1.0", clientBotSignalMask: 1 })).toBe(
      false
    );
  });

  it("convicts on the user agent and header layers of a web Site only", () => {
    const headless = { ...browser, userAgent: "Mozilla/5.0 HeadlessChrome/120" };
    expect(isBlockedReplayBot(headless)).toBe(true);
    expect(isBlockedReplayBot({ ...headless, isMobileSite: true })).toBe(false);
    expect(isBlockedReplayBot({ ...browser, headers: { "user-agent": CHROME_UA } })).toBe(true);
  });

  it("convicts on strong client signals, sent or re-derived from the screen", () => {
    expect(isBlockedReplayBot({ ...browser, clientBotSignalMask: CLIENT_BOT_SIGNAL_MASKS.automationApi })).toBe(true);
    expect(isBlockedReplayBot({ ...browser, screenWidth: 1280, screenHeight: 1200 })).toBe(true);
  });

  it("does not convict on weak client signals alone", () => {
    const weak =
      CLIENT_BOT_SIGNAL_MASKS.emptyPlugins |
      CLIENT_BOT_SIGNAL_MASKS.swiftShader |
      CLIENT_BOT_SIGNAL_MASKS.missingChrome;
    expect(isBlockedReplayBot({ ...browser, clientBotSignalMask: weak })).toBe(false);
  });

  it("convicts curated bot-provider ASNs but not generic hosting", () => {
    expect(isBlockedReplayBot({ ...browser, lookupAsn: () => ({ asn: 4167, organization: "Anthropic" }) })).toBe(true);
    expect(isBlockedReplayBot({ ...browser, lookupAsn: () => ({ asn: 16509, organization: "Amazon" }) })).toBe(false);
  });
});
