import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_BOT_SIGNAL_MASKS, getBotScore, getBotSignalMask, resetBotScoreCacheForTests } from "./botSignals.js";

function setNavigatorProperty(name: string, value: unknown) {
  Object.defineProperty(navigator, name, {
    value,
    configurable: true,
  });
}

function setWindowProperty(name: string, value: unknown) {
  Object.defineProperty(window, name, {
    value,
    configurable: true,
  });
}

describe("getBotScore", () => {
  beforeEach(() => {
    resetBotScoreCacheForTests();
    setNavigatorProperty(
      "userAgent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    setNavigatorProperty("webdriver", false);
    setNavigatorProperty("plugins", { length: 5 });
    setWindowProperty("screen", { width: 1920, height: 1080 });
    setWindowProperty("outerHeight", 768);
    setWindowProperty("outerWidth", 1024);
    setWindowProperty("innerHeight", 720);
    setWindowProperty("innerWidth", 1000);
    setWindowProperty("chrome", {});
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: vi.fn(() => null),
      configurable: true,
    });
  });

  it("returns zero for a normal Chrome-like browser environment", () => {
    expect(getBotScore()).toBe(0);
    expect(getBotSignalMask()).toBe(0);
  });

  it("weights automation APIs as blocking-strength signals", () => {
    setNavigatorProperty("webdriver", true);

    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.automationApi);
  });

  it("adds weighted supporting signals", () => {
    setNavigatorProperty("webdriver", true);
    setNavigatorProperty("plugins", { length: 0 });
    setWindowProperty("outerHeight", 0);
    setWindowProperty("chrome", undefined);

    expect(getBotScore()).toBe(7);
    expect(getBotSignalMask()).toBe(
      CLIENT_BOT_SIGNAL_MASKS.automationApi |
        CLIENT_BOT_SIGNAL_MASKS.zeroOuterDimensions |
        CLIENT_BOT_SIGNAL_MASKS.missingChrome |
        CLIENT_BOT_SIGNAL_MASKS.emptyPlugins |
        CLIENT_BOT_SIGNAL_MASKS.pluginApiAbsence
    );
  });

  it("weights default automation viewports as blocking-strength signals", () => {
    setWindowProperty("screen", { width: 800, height: 600 });

    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.defaultViewport800x600);

    resetBotScoreCacheForTests();
    setWindowProperty("screen", { width: 1024, height: 768 });

    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.defaultViewport1024x768);
  });

  it("weights impossible dimensions as a blocking-strength signal", () => {
    setWindowProperty("screen", { width: 0, height: 1080 });

    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.impossibleDimensions);
  });

  it("counts outer dimension anomalies as a supporting signal", () => {
    setWindowProperty("outerWidth", 800);
    setWindowProperty("innerWidth", 1000);

    expect(getBotScore()).toBe(2);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.outerDimensionsWeird);
  });

  it("counts SwiftShader as a supporting signal", () => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: vi.fn(() => ({
        getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 1 }),
        getParameter: () => "Google SwiftShader",
      })),
      configurable: true,
    });

    expect(getBotScore()).toBe(1);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.swiftShader);
  });

  it("caches the score for the page lifecycle", () => {
    setNavigatorProperty("webdriver", true);
    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.automationApi);

    setNavigatorProperty("webdriver", false);
    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.automationApi);
  });
});
