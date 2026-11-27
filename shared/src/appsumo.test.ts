import { describe, expect, it } from "vitest";
import { appsumoProCredit } from "./appsumo";

describe("appsumoProCredit", () => {
  it("credits the matching Standard price on a Pro plan covering the tier", () => {
    expect(appsumoProCredit("2", { isPro: true, interval: "month", events: 100_000 })).toBe(19);
    expect(appsumoProCredit("2", { isPro: true, interval: "month", events: 250_000 })).toBe(19);
  });

  it("credits eight months on annual plans", () => {
    expect(appsumoProCredit("2", { isPro: true, interval: "year", events: 100_000 })).toBe(152);
  });

  it("skips non-Pro plans", () => {
    expect(appsumoProCredit("2", { isPro: false, interval: "month", events: 250_000 })).toBeNull();
  });

  it("skips Pro plans with fewer events than the tier", () => {
    expect(appsumoProCredit("5", { isPro: true, interval: "month", events: 500_000 })).toBeNull();
    expect(appsumoProCredit("7", { isPro: true, interval: "month", events: 2_000_000 })).toBeNull();
    expect(appsumoProCredit("7", { isPro: true, interval: "month", events: 5_000_000 })).toBe(99);
  });

  it("skips unknown tiers", () => {
    expect(appsumoProCredit("9", { isPro: true, interval: "month", events: 50_000_000 })).toBeNull();
  });
});
