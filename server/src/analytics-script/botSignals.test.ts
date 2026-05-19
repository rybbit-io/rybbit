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
    setWindowProperty("outerHeight", 768);
    setWindowProperty("outerWidth", 1024);
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

  it("weights webdriver as a blocking-strength signal", () => {
    setNavigatorProperty("webdriver", true);

    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.webdriver);
  });

  it("adds weighted supporting signals", () => {
    setNavigatorProperty("webdriver", true);
    setNavigatorProperty("plugins", { length: 0 });
    setWindowProperty("outerHeight", 0);
    setWindowProperty("chrome", undefined);

    expect(getBotScore()).toBe(7);
    expect(getBotSignalMask()).toBe(
      CLIENT_BOT_SIGNAL_MASKS.webdriver |
        CLIENT_BOT_SIGNAL_MASKS.zeroOuterDimensions |
        CLIENT_BOT_SIGNAL_MASKS.missingChrome |
        CLIENT_BOT_SIGNAL_MASKS.emptyPlugins
    );
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
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.webdriver);

    setNavigatorProperty("webdriver", false);
    expect(getBotScore()).toBe(3);
    expect(getBotSignalMask()).toBe(CLIENT_BOT_SIGNAL_MASKS.webdriver);
  });
});
