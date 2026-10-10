import { describe, expect, it } from "vitest";
import {
  describeRange,
  EMPTY_RANGES,
  hasAnyRange,
  hasRange,
  parseBound,
  toRange,
  toRangeParams,
} from "./sessionRanges";

describe("parseBound", () => {
  it("accepts whole numbers of zero or more", () => {
    expect(parseBound("0")).toBe(0);
    expect(parseBound(" 12 ")).toBe(12);
  });

  it("treats anything else as no bound", () => {
    for (const text of ["", "  ", "-3", "2.5", "1e3", "ten", "5s"]) {
      expect(parseBound(text)).toBeUndefined();
    }
  });

  it("stays inside what the server can bind", () => {
    expect(parseBound("99999999999999")).toBe(2_147_483_647);
  });
});

describe("toRange", () => {
  it("keeps only the bounds that were typed", () => {
    expect(toRange("3", "")).toEqual({ min: 3 });
    expect(toRange("", "8")).toEqual({ max: 8 });
    expect(toRange("3", "8")).toEqual({ min: 3, max: 8 });
    expect(toRange("", "")).toEqual({});
  });

  it("swaps bounds typed the wrong way round instead of matching nothing", () => {
    expect(toRange("8", "3")).toEqual({ min: 3, max: 8 });
  });

  it("drops an at-least-zero bound, which narrows nothing", () => {
    expect(toRange("0", "")).toEqual({});
    expect(toRange("0", "4")).toEqual({ max: 4 });
    // At most zero is a real range: sessions with none.
    expect(toRange("", "0")).toEqual({ max: 0 });
  });
});

describe("describeRange", () => {
  it("names the shape of the range for its chip", () => {
    expect(describeRange({})).toEqual({ kind: "any" });
    expect(describeRange({ min: 10 })).toEqual({ kind: "min", min: 10 });
    expect(describeRange({ max: 5 })).toEqual({ kind: "max", max: 5 });
    expect(describeRange({ min: 2, max: 5 })).toEqual({ kind: "between", min: 2, max: 5 });
    expect(describeRange({ min: 3, max: 3 })).toEqual({ kind: "exact", value: 3 });
    expect(describeRange({ max: 0 })).toEqual({ kind: "max", max: 0 });
  });
});

describe("range state", () => {
  it("knows when anything is narrowing the list", () => {
    expect(hasRange({})).toBe(false);
    expect(hasRange({ max: 0 })).toBe(true);
    expect(hasAnyRange(EMPTY_RANGES)).toBe(false);
    expect(hasAnyRange({ ...EMPTY_RANGES, duration: { min: 10 } })).toBe(true);
  });

  it("maps onto the hook params one for one", () => {
    expect(toRangeParams({ pageviews: { min: 2 }, events: { max: 9 }, duration: { min: 10, max: 600 } })).toEqual({
      minPageviews: 2,
      maxPageviews: undefined,
      minEvents: undefined,
      maxEvents: 9,
      minDuration: 10,
      maxDuration: 600,
    });
  });
});
