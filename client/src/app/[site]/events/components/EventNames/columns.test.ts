import { describe, expect, it } from "vitest";
import { COLUMN, visibleColumnCount } from "./columns";

describe("visibleColumnCount", () => {
  it("counts every column before the card has been measured", () => {
    expect(visibleColumnCount(null)).toBe(9);
    expect(visibleColumnCount(null, false)).toBe(8);
  });

  it.each([
    [358, 2],
    [479, 2],
    [480, 3],
    [640, 5],
    [723, 5],
    [760, 6],
    [840, 7],
    [930, 8],
    [1119, 8],
    [1120, 9],
    [1368, 9],
  ])("shows %i px of card as %i columns", (width, columns) => {
    expect(visibleColumnCount(width)).toBe(columns);
  });

  it("leaves the change column out when there is no comparison", () => {
    expect(visibleColumnCount(639, false)).toBe(3);
    expect(visibleColumnCount(640, false)).toBe(4);
    expect(visibleColumnCount(1120, false)).toBe(8);
  });

  it("uses the same threshold in the class and in the count", () => {
    for (const [column, className] of Object.entries(COLUMN)) {
      const minWidth = Number(/@min-\[(\d+)px\]/.exec(className)?.[1]);
      const hasChange = true;
      // One pixel short of the class's threshold the column is not counted; at it, it is.
      expect(
        visibleColumnCount(minWidth, hasChange) - visibleColumnCount(minWidth - 1, hasChange),
        column
      ).toBeGreaterThan(0);
    }
  });
});
