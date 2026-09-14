import {
  ALL_CLIENT_BOT_SIGNAL_BITS,
  CLIENT_BOT_SIGNAL_MASKS,
  CLIENT_BOT_SIGNAL_NAMES,
  CLIENT_BOT_SIGNAL_WEIGHTS,
  getClientBotSignalNames,
  getScreenDimensionSignals,
  IMPLAUSIBLE_DESKTOP_VIEWPORTS,
  MAX_PLAUSIBLE_SCREEN_DIMENSION,
  MIN_PLAUSIBLE_SCREEN_DIMENSION,
  scoreFromMask,
  STRONG_CLIENT_BOT_SIGNAL_BITS,
} from "@rybbit/shared";
import { describe, expect, it } from "vitest";

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1";

describe("the Bot Signal mask", () => {
  it("gives every signal its own single bit", () => {
    const bits = CLIENT_BOT_SIGNAL_NAMES.map(name => CLIENT_BOT_SIGNAL_MASKS[name]);

    for (const bit of bits) {
      expect(bit, "each signal occupies exactly one bit").toBeGreaterThan(0);
      expect(bit & (bit - 1), `${bit} is a power of two`).toBe(0);
    }
    expect(new Set(bits).size, "no two signals share a bit").toBe(bits.length);
  });

  it("weights every signal it defines", () => {
    for (const name of CLIENT_BOT_SIGNAL_NAMES) {
      expect(CLIENT_BOT_SIGNAL_WEIGHTS[name], `${name} has a weight`).toBeTypeOf("number");
    }
    expect(Object.keys(CLIENT_BOT_SIGNAL_WEIGHTS).sort()).toEqual([...CLIENT_BOT_SIGNAL_NAMES].sort());
  });

  // The bound the ingest schema applies to `_bsm`. A hard-coded bound is how the
  // 12th bit (squareScreen = 2048) came to fail validation and drop whole
  // events, so it has to be the union of whatever the table currently declares.
  it("bounds itself by the union of every declared bit", () => {
    const union = CLIENT_BOT_SIGNAL_NAMES.reduce((mask, name) => mask | CLIENT_BOT_SIGNAL_MASKS[name], 0);

    expect(ALL_CLIENT_BOT_SIGNAL_BITS).toBe(union);
    expect(ALL_CLIENT_BOT_SIGNAL_BITS & CLIENT_BOT_SIGNAL_MASKS.squareScreen).toBe(
      CLIENT_BOT_SIGNAL_MASKS.squareScreen
    );
  });

  it("only convicts on signals it also defines", () => {
    expect(STRONG_CLIENT_BOT_SIGNAL_BITS & ~ALL_CLIENT_BOT_SIGNAL_BITS).toBe(0);
    expect(STRONG_CLIENT_BOT_SIGNAL_BITS).toBeGreaterThan(0);
  });
});

describe("reading a mask", () => {
  it("names the signals a mask carries and ignores bits it does not define", () => {
    const mask = CLIENT_BOT_SIGNAL_MASKS.automationApi | CLIENT_BOT_SIGNAL_MASKS.squareScreen | (1 << 30);

    expect(getClientBotSignalNames(mask)).toEqual(["automationApi", "squareScreen"]);
  });

  it("scores a mask as the sum of its signal weights", () => {
    const mask = CLIENT_BOT_SIGNAL_MASKS.automationApi | CLIENT_BOT_SIGNAL_MASKS.emptyPlugins;

    expect(scoreFromMask(mask)).toBe(
      CLIENT_BOT_SIGNAL_WEIGHTS.automationApi + CLIENT_BOT_SIGNAL_WEIGHTS.emptyPlugins
    );
    expect(scoreFromMask(0)).toBe(0);
    expect(scoreFromMask(1 << 30), "undefined bits carry no weight").toBe(0);
  });
});

describe("the screen-geometry rules", () => {
  it("leaves real displays alone", () => {
    for (const [width, height] of [
      [1920, 1080],
      [MIN_PLAUSIBLE_SCREEN_DIMENSION, 320],
      [7680, 4320],
      [MAX_PLAUSIBLE_SCREEN_DIMENSION, 4320],
    ]) {
      expect(getScreenDimensionSignals(width, height, DESKTOP_UA), `${width}x${height}`).toEqual([]);
    }
  });

  it("flags displays no real one reports, and says nothing else about them", () => {
    for (const [width, height] of [
      [1, 1],
      [16384, 16384],
      [1920, 10000],
      [199, 800],
      [Number.NaN, 1080],
    ]) {
      expect(getScreenDimensionSignals(width, height, DESKTOP_UA), `${width}x${height}`).toEqual([
        "impossibleDimensions",
      ]);
    }
  });

  it("flags a square screen on any platform", () => {
    expect(getScreenDimensionSignals(2000, 2000, DESKTOP_UA)).toEqual(["squareScreen"]);
    expect(getScreenDimensionSignals(2000, 2000, MOBILE_UA)).toEqual(["squareScreen"]);
  });

  it("flags default automation viewports on desktop user agents only", () => {
    for (const viewport of IMPLAUSIBLE_DESKTOP_VIEWPORTS) {
      expect(getScreenDimensionSignals(viewport.width, viewport.height, DESKTOP_UA)).toContain(viewport.signal);
      expect(getScreenDimensionSignals(viewport.width, viewport.height, MOBILE_UA)).toEqual([]);
    }
  });

  // The tracker computes these from window.screen and the server re-derives them
  // from the reported dimensions. Both call this function, so a signal that
  // convicts must be reachable from the score the tracker would have sent.
  it("produces signals the weights table can score", () => {
    const signals = [
      ...getScreenDimensionSignals(1, 1, DESKTOP_UA),
      ...getScreenDimensionSignals(2000, 2000, DESKTOP_UA),
      ...IMPLAUSIBLE_DESKTOP_VIEWPORTS.flatMap(viewport =>
        getScreenDimensionSignals(viewport.width, viewport.height, DESKTOP_UA)
      ),
    ];

    for (const signal of signals) {
      expect(CLIENT_BOT_SIGNAL_MASKS[signal], `${signal} is in the mask table`).toBeGreaterThan(0);
      expect(CLIENT_BOT_SIGNAL_WEIGHTS[signal], `${signal} is in the weights table`).toBeGreaterThan(0);
    }
  });
});
