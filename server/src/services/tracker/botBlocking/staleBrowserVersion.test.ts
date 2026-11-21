import { describe, expect, it } from "vitest";
import { classifyStaleBrowserVersion } from "./staleBrowserVersion.js";

const androidChrome = (version: number) =>
  `Mozilla/5.0 (Linux; Android 8.0; SM-G930F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Mobile Safari/537.36`;

const desktopChrome = (version: number) =>
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;

describe("classifyStaleBrowserVersion", () => {
  it("flags the rotating old-Chrome fleet", () => {
    // The fleet spans Chrome 39-60 uniformly; spot-check both ends.
    expect(classifyStaleBrowserVersion(androidChrome(39))).toMatchObject({
      isStale: true,
      matchedVersion: "Chrome/39",
      majorVersion: 39,
    });
    expect(classifyStaleBrowserVersion(androidChrome(60))).toMatchObject({ isStale: true, majorVersion: 60 });
  });

  it("leaves current browsers alone", () => {
    expect(classifyStaleBrowserVersion(desktopChrome(151))).toMatchObject({ isStale: false });
    expect(classifyStaleBrowserVersion(androidChrome(150))).toMatchObject({ isStale: false });
  });

  it("leaves the cutoff itself and the older-but-real range alone", () => {
    // Versions in the 90-110 range do show engagement in production and stay
    // out of scope; 70 is the first supported major.
    expect(classifyStaleBrowserVersion(desktopChrome(70))).toMatchObject({ isStale: false });
    expect(classifyStaleBrowserVersion(desktopChrome(95))).toMatchObject({ isStale: false });
    expect(classifyStaleBrowserVersion(desktopChrome(69))).toMatchObject({ isStale: true });
  });

  it("ignores Android WebView, where an old Chrome major is genuine", () => {
    expect(
      classifyStaleBrowserVersion(
        "Mozilla/5.0 (Linux; Android 11; SM-A115M Build/RP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.121 Mobile Safari/537.36"
      )
    ).toMatchObject({ isStale: false });
  });

  it("ignores Safari, whose numbering tracks the OS rather than a release train", () => {
    expect(
      classifyStaleBrowserVersion(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1"
      )
    ).toMatchObject({ isStale: false });
  });

  it("reads the version token of each supported release train", () => {
    expect(classifyStaleBrowserVersion("Mozilla/5.0 Firefox/52.0")).toMatchObject({
      isStale: true,
      matchedVersion: "Firefox/52",
    });
    expect(
      classifyStaleBrowserVersion("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/48.0.2564.87 Mobile/15E148 Safari/604.1")
    ).toMatchObject({ isStale: true, matchedVersion: "CriOS/48" });
    expect(classifyStaleBrowserVersion("Mozilla/5.0 (Windows NT 10.0) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0")).toMatchObject(
      { isStale: false }
    );
  });

  it("ignores user-agents with no recognizable version token", () => {
    expect(classifyStaleBrowserVersion("okhttp/4.12.0")).toMatchObject({ isStale: false });
    expect(classifyStaleBrowserVersion("")).toMatchObject({ isStale: false });
    expect(classifyStaleBrowserVersion(undefined)).toMatchObject({ isStale: false });
  });
});
