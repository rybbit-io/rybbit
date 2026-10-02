import { describe, expect, it } from "vitest";
import { sparkFlights } from "./spark-burst";

// The first-pageview card's frog: a 32×21 glyph, with the burst landing inside the card.
const inner = { x: 18, y: 13 };
const outer = { x: 42, y: 36 };
const flights = sparkFlights(inner, outer);

describe("sparkFlights", () => {
  it("launches eight 4–6px sparks, staggered by at most 60ms", () => {
    expect(flights).toHaveLength(8);
    for (const flight of flights) {
      expect(flight.size).toBeGreaterThanOrEqual(4);
      expect(flight.size).toBeLessThanOrEqual(6);
      expect(flight.delay).toBeLessThanOrEqual(0.06);
    }
  });

  it("starts around the glyph rather than on it, and travels outward 16–28px", () => {
    for (const { from, to } of flights) {
      // On the inner ellipse, which clears a 32×21 glyph's edges.
      expect((from.x / inner.x) ** 2 + (from.y / inner.y) ** 2).toBeCloseTo(1, 1);
      expect(Math.hypot(to.x, to.y)).toBeGreaterThan(Math.hypot(from.x, from.y));
      const travel = Math.hypot(to.x - from.x, to.y - from.y);
      expect(travel).toBeGreaterThanOrEqual(16);
      expect(travel).toBeLessThanOrEqual(28);
    }
  });

  it("lands inside the outer ellipse, so a clipping parent sized to it never cuts a spark off", () => {
    for (const { to } of flights) {
      expect((to.x / outer.x) ** 2 + (to.y / outer.y) ** 2).toBeLessThanOrEqual(1.001);
    }
  });

  it("is the same burst every time", () => {
    expect(sparkFlights(inner, outer)).toEqual(flights);
  });
});
