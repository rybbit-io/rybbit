import { describe, expect, it } from "vitest";
import { normalizeUserAgentForIdentity } from "./normalizeUserAgent.js";

/**
 * Every fixture below is a real user agent captured off production ingestion
 * (op.gg's Rybbit instance, 2026-08-18), so the pairs that must collapse are
 * pairs that actually did split a visitor in two.
 */
const UA = {
  opggElectron251:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) opgg-electron-app/2.5.1 Chrome/132.0.6834.210 Electron/34.5.7 Safari/537.36",
  opggElectron253:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) opgg-electron-app/2.5.3 Chrome/142.0.7444.265 Electron/39.8.13 Safari/537.36",
  chromeWin150:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  chromeWin151:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  edgeWin151:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0",
  safariIos1857:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1",
  safariIos266:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1",
  safariIpad266:
    "Mozilla/5.0 (iPad; CPU OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/151.0.7922.112 Mobile/15E148 Safari/604.1",
  chromeIosPatched:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/151.0.7922.140 Mobile/15E148 Safari/604.1",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  androidS928N:
    "Mozilla/5.0 (Linux; Android 15; SM-S928N Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
  androidA536N:
    "Mozilla/5.0 (Linux; Android 15; SM-A536N Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
  reactNative:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) RybbitReactNative/0.1.1 8.0.14",
  reactNativeBumped:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) RybbitReactNative/0.2.0 8.1.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
  firefoxNext: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:154.0) Gecko/20100101 Firefox/154.0",
  // In-app browsers put hardware identifiers in the same slash-delimited slot a
  // version normally occupies, which an over-eager rule will happily destroy.
  fbIosPhone12:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBDV/iPhone12,8;FBAV/440.0.0.32.108]",
  fbIosPhone14:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBDV/iPhone14,8;FBAV/440.0.0.32.108]",
  fbIosPhone12Updated:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [FBAN/FBIOS;FBDV/iPhone12,8;FBAV/441.0.0.28.90]",
  fbAndroidJ320F:
    "Mozilla/5.0 (Linux; Android 9; SM-J320F) AppleWebKit/537.36 [FBAN/EMA;FBDV/SM-J320F;FBCA/armeabi-v7a:armeabi;FBAV/239.0.0.10.109]",
  fbAndroidG930F:
    "Mozilla/5.0 (Linux; Android 9; SM-G930F) AppleWebKit/537.36 [FBAN/EMA;FBDV/SM-G930F;FBCA/armeabi-v7a:armeabi;FBAV/239.0.0.10.109]",
  // Two different handsets whose *model names* contain a dotted number.
  nokia61Plus:
    "Mozilla/5.0 (Linux; Android 10; Nokia 6.1 Plus Build/QKQ1.190828.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.178 Mobile Safari/537.36",
  nokia83Plus:
    "Mozilla/5.0 (Linux; Android 10; Nokia 8.3 Plus Build/QKQ1.190828.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.178 Mobile Safari/537.36",
};

const same = (a: string, b: string) => expect(normalizeUserAgentForIdentity(a)).toBe(normalizeUserAgentForIdentity(b));
const differs = (a: string, b: string) =>
  expect(normalizeUserAgentForIdentity(a)).not.toBe(normalizeUserAgentForIdentity(b));

describe("normalizeUserAgentForIdentity", () => {
  describe("survives updates", () => {
    // The regression this exists for: op.gg's auto-updater flipped the whole
    // install base to 2.5.3 inside a day (the diagnosed boundary was 2.5.2 →
    // 2.5.3), re-minting every id. The captured pair below spans the same
    // three-token move — app, Chromium and Electron versions all at once.
    it("collapses an Electron app update (app, Chromium and Electron all bumped)", () => {
      same(UA.opggElectron251, UA.opggElectron253);
    });

    it("collapses a Chrome major bump", () => same(UA.chromeWin150, UA.chromeWin151));

    it("collapses an iOS point release, which moves both the OS and Safari tokens", () => {
      same(UA.safariIos1857, UA.safariIos266);
    });

    // Chrome on iOS does not do UA reduction, so every patch used to reset it.
    it("collapses a Chrome-on-iOS patch", () => same(UA.chromeIos, UA.chromeIosPatched));

    it("collapses a Firefox bump, including the rv: revision", () => same(UA.firefox, UA.firefoxNext));

    it("collapses a React Native app bump, including the bare trailing version", () => {
      same(UA.reactNative, UA.reactNativeBumped);
    });
  });

  describe("keeps distinct devices distinct", () => {
    it("separates browser families on the same OS", () => differs(UA.chromeWin151, UA.edgeWin151));
    it("separates Firefox from Chrome", () => differs(UA.chromeWin151, UA.firefox));
    it("separates operating systems", () => differs(UA.chromeWin151, UA.macSafari));
    it("separates iPhone from iPad", () => differs(UA.safariIos266, UA.safariIpad266));
    it("separates Safari from Chrome on the same iPhone", () => differs(UA.safariIos266, UA.chromeIos));
    it("separates a native app from the browser on the same OS", () => {
      differs(UA.reactNative, UA.safariIos266);
    });

    // Android model strings carry digits but never change under the user, so
    // they are entropy worth keeping.
    it("keeps Android device models apart", () => differs(UA.androidS928N, UA.androidA536N));
  });

  describe("keeps hardware identifiers, which never change under the user", () => {
    // Regression: an earlier rule elided any slash value containing a digit,
    // turning `FBDV/iPhone12,8` into `FBDV/#,8` and fusing every iPhone model
    // that shared a point release.
    it("keeps the iOS device model in a Facebook in-app user agent", () => {
      expect(normalizeUserAgentForIdentity(UA.fbIosPhone12)).toContain("FBDV/iPhone12,8");
    });

    it("separates two iPhone models behind the same in-app browser", () => {
      differs(UA.fbIosPhone12, UA.fbIosPhone14);
    });

    it("still collapses the in-app browser's own version bump", () => {
      same(UA.fbIosPhone12, UA.fbIosPhone12Updated);
    });

    it("keeps the Android model and CPU ABI in a Facebook in-app user agent", () => {
      const normalized = normalizeUserAgentForIdentity(UA.fbAndroidJ320F);
      expect(normalized).toContain("FBDV/SM-J320F");
      expect(normalized).toContain("FBCA/armeabi-v7a:armeabi");
    });

    it("separates two Android models behind the same in-app browser", () => {
      differs(UA.fbAndroidJ320F, UA.fbAndroidG930F);
    });

    // Regression: a two-group bare-version rule read the `6.1` in `Nokia 6.1
    // Plus` as a version and merged it with every other dotted Nokia.
    it("keeps a dotted marketing model name", () => {
      expect(normalizeUserAgentForIdentity(UA.nokia61Plus)).toContain("Nokia 6.1 Plus");
    });

    it("separates two handsets whose model names differ only in their digits", () => {
      differs(UA.nokia61Plus, UA.nokia83Plus);
    });
  });

  describe("mechanics", () => {
    it("elides every version token in a representative desktop UA", () => {
      expect(normalizeUserAgentForIdentity(UA.chromeWin151)).toBe(
        "Mozilla/# (Windows NT #; Win64; x64) AppleWebKit/# (KHTML, like Gecko) Chrome/# Safari/#"
      );
    });

    it("keeps the Android model while eliding the OS and build", () => {
      expect(normalizeUserAgentForIdentity(UA.androidS928N)).toBe(
        "Mozilla/# (Linux; Android #; SM-S928N Build/#) AppleWebKit/# (KHTML, like Gecko) Chrome/# Mobile Safari/#"
      );
    });

    it("is idempotent, so a normalized value re-normalizes to itself", () => {
      for (const ua of Object.values(UA)) {
        const once = normalizeUserAgentForIdentity(ua);
        expect(normalizeUserAgentForIdentity(once)).toBe(once);
      }
    });

    it("passes an empty user agent through untouched", () => {
      expect(normalizeUserAgentForIdentity("")).toBe("");
    });

    it("leaves a version-free user agent alone", () => {
      expect(normalizeUserAgentForIdentity("Mediapartners-Google")).toBe("Mediapartners-Google");
    });
  });
});
