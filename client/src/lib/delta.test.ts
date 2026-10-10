import { describe, expect, it } from "vitest";
import {
  deltaTone,
  formatPercentChange,
  formatPointChange,
  NO_DELTA_TEXT,
  percentChange,
  percentDelta,
  pointDelta,
} from "./delta";

describe("percentChange", () => {
  it("is the relative change in percent", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(75, 100)).toBe(-25);
    expect(percentChange(100, 100)).toBe(0);
  });

  it("has no answer without a baseline", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
    expect(percentChange(10, Number.NaN)).toBeNull();
    expect(percentChange(Number.POSITIVE_INFINITY, 10)).toBeNull();
  });
});

describe("formatPercentChange", () => {
  it("signs the change and keeps one decimal by default", () => {
    expect(formatPercentChange(12.44)).toBe("+12.4%");
    expect(formatPercentChange(-3.06)).toBe("-3.1%");
    expect(formatPercentChange(14)).toBe("+14.0%");
  });

  it("writes no sign on a change that rounds to zero", () => {
    expect(formatPercentChange(0)).toBe("0.0%");
    expect(formatPercentChange(0.04)).toBe("0.0%");
    expect(formatPercentChange(-0.04)).toBe("0.0%");
  });

  it("honours the decimals option", () => {
    expect(formatPercentChange(12.44, { decimals: 0 })).toBe("+12%");
    expect(formatPercentChange(-0.126, { decimals: 2 })).toBe("-0.13%");
  });

  it("caps a runaway percentage", () => {
    expect(formatPercentChange(999)).toBe("+999.0%");
    expect(formatPercentChange(4200)).toBe(">999%");
    expect(formatPercentChange(-4200)).toBe("<-999%");
  });
});

describe("formatPointChange", () => {
  it('writes percentage points as "pp"', () => {
    expect(formatPointChange(2.1)).toBe("+2.1 pp");
    expect(formatPointChange(-0.33, { decimals: 2 })).toBe("-0.33 pp");
    expect(formatPointChange(0)).toBe("0.0 pp");
    expect(formatPointChange(-0.04)).toBe("0.0 pp");
  });
});

describe("percentDelta", () => {
  it("describes a rise", () => {
    expect(percentDelta(1124, 1000)).toEqual({ direction: "up", text: "12.4%", signed: "+12.4%" });
  });

  it("describes a fall", () => {
    expect(percentDelta(951, 1000)).toEqual({ direction: "down", text: "4.9%", signed: "-4.9%" });
  });

  it("is flat when the change rounds to nothing", () => {
    expect(percentDelta(1000, 1000)).toEqual({ direction: "flat", text: "0.0%", signed: "0.0%" });
    expect(percentDelta(10004, 10000)).toEqual({ direction: "flat", text: "0.0%", signed: "0.0%" });
    expect(percentDelta(9996, 10000)).toEqual({ direction: "flat", text: "0.0%", signed: "0.0%" });
  });

  it("is flat when both periods are empty", () => {
    expect(percentDelta(0, 0)).toEqual({ direction: "flat", text: "0.0%", signed: "0.0%" });
  });

  it("is the neutral no-baseline state when only the previous period is empty", () => {
    expect(percentDelta(42, 0)).toEqual({ direction: "none", text: NO_DELTA_TEXT, signed: NO_DELTA_TEXT });
  });

  it("draws nothing when a side is missing", () => {
    expect(percentDelta(42, undefined)).toBeNull();
    expect(percentDelta(42, null)).toBeNull();
    expect(percentDelta(undefined, 42)).toBeNull();
    expect(percentDelta(42, Number.NaN)).toBeNull();
  });

  it("keeps a runaway rise readable beside its arrow", () => {
    expect(percentDelta(5000, 100)).toEqual({ direction: "up", text: ">999%", signed: ">999%" });
  });

  it("honours the decimals option", () => {
    expect(percentDelta(1124, 1000, { decimals: 0 })).toEqual({ direction: "up", text: "12%", signed: "+12%" });
  });

  it("measures against the size of a negative baseline", () => {
    expect(percentDelta(-50, -100)).toEqual({ direction: "up", text: "50.0%", signed: "+50.0%" });
  });
});

describe("pointDelta", () => {
  it("subtracts two rates on the same percent scale", () => {
    expect(pointDelta(43.3, 41.2)).toEqual({ direction: "up", text: "2.1 pp", signed: "+2.1 pp" });
    expect(pointDelta(39.3, 41.2)).toEqual({ direction: "down", text: "1.9 pp", signed: "-1.9 pp" });
  });

  it("is flat when the change rounds to nothing", () => {
    expect(pointDelta(47.12, 47.1)).toEqual({ direction: "flat", text: "0.0 pp", signed: "0.0 pp" });
  });

  it("has a real answer against a rate of zero", () => {
    expect(pointDelta(4.73, 0, { decimals: 2 })).toEqual({ direction: "up", text: "4.73 pp", signed: "+4.73 pp" });
  });

  it("draws nothing when a side is missing", () => {
    expect(pointDelta(41.2, undefined)).toBeNull();
    expect(pointDelta(null, 41.2)).toBeNull();
  });
});

describe("deltaTone", () => {
  it("reads up as good by default", () => {
    expect(deltaTone("up")).toBe("good");
    expect(deltaTone("down")).toBe("bad");
  });

  it("flips for metrics where up is bad", () => {
    expect(deltaTone("up", false)).toBe("bad");
    expect(deltaTone("down", false)).toBe("good");
  });

  it("is neutral with no change or no baseline", () => {
    expect(deltaTone("flat")).toBe("neutral");
    expect(deltaTone("flat", false)).toBe("neutral");
    expect(deltaTone("none")).toBe("neutral");
  });
});
