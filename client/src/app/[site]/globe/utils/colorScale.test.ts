import { describe, expect, it } from "vitest";
import { createColorScale, readDataColor } from "./colorScale";

const DATA = "230 100% 85%";
const alphaOf = (color: string) => Number(color.match(/, ([\d.]+)\)$/)?.[1]);

describe("createColorScale", () => {
  it("draws every value in the data hue, never the accent", () => {
    const scale = createColorScale([10, 100], "count", DATA);
    expect(scale.color(100)).toBe("hsla(230, 100%, 85%, 0.92)");
    expect(scale.range).toEqual(["hsla(230, 100%, 85%, 0.16)", "hsla(230, 100%, 85%, 0.92)"]);
    expect(scale.tint(0.35)).toBe("hsla(230, 100%, 85%, 0.35)");
  });

  it("puts counts on a power curve so small places stay visible", () => {
    const scale = createColorScale([1, 24310], "count", DATA);

    // One session against 24,310 is 0.004% of the way linearly; the curve lifts it clear of the floor.
    expect(alphaOf(scale.color(1))).toBeGreaterThan(0.17);
    expect(alphaOf(scale.color(2430))).toBeGreaterThan(0.4);
    expect(alphaOf(scale.color(24310))).toBe(0.92);
  });

  it("puts rates on a straight line between the lowest and highest", () => {
    const scale = createColorScale([20, 40, 60], "rate", DATA);

    expect(alphaOf(scale.color(20))).toBe(0.16);
    expect(alphaOf(scale.color(40))).toBe(0.54);
    expect(alphaOf(scale.color(60))).toBe(0.92);
    expect(scale.ticks).toEqual([
      { value: 20, position: 0 },
      { value: 40, position: 0.5 },
      { value: 60, position: 1 },
    ]);
  });

  it("lifts a hovered place without passing full opacity", () => {
    const scale = createColorScale([10, 100], "count", DATA);
    expect(alphaOf(scale.color(100, 0.15))).toBe(1);
    expect(alphaOf(scale.color(10, 0.15))).toBeGreaterThan(alphaOf(scale.color(10)));
  });

  it("labels the legend with round numbers in order, ending on the maximum", () => {
    const { ticks } = createColorScale([3, 800, 24310], "count", DATA);
    const values = ticks.map(tick => tick.value);

    expect(values[0]).toBe(1);
    expect(values[values.length - 1]).toBe(24310);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(ticks[ticks.length - 1].position).toBe(1);
    // Labels are spaced out along the bar.
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].position - ticks[i - 1].position).toBeGreaterThanOrEqual(0.14);
    }
    for (const value of values.slice(1, -1)) {
      expect(String(value)).toMatch(/^[125]0*$/);
    }
  });

  it("copes with a single place and with no places", () => {
    expect(createColorScale([1], "count", DATA).ticks).toEqual([{ value: 1, position: 1 }]);
    expect(createColorScale([], "count", DATA).ticks).toEqual([]);
    expect(createColorScale([], "rate", DATA).ticks).toEqual([]);

    const flat = createColorScale([50, 50], "rate", DATA);
    expect(alphaOf(flat.color(50))).toBe(0.54);
    expect(flat.ticks).toEqual([{ value: 50, position: 0.5 }]);
  });
});

describe("readDataColor", () => {
  it("uses a darker shade of the same hue on a light basemap", () => {
    expect(readDataColor("light")).toMatch(/^230 /);
    expect(readDataColor("light")).not.toBe(readDataColor("dark"));
  });
});
