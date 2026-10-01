import type { Annotation } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { annotationsInWindow } from "./annotationWindow";
import {
  findOnlyPoorRow,
  formatMetric,
  formatShare,
  getMetricRating,
  getRatingSplit,
  PERFORMANCE_METRICS,
} from "./performanceUtils";

describe("getMetricRating", () => {
  it("rates a value on the limit as the better of the two", () => {
    expect(getMetricRating("lcp", 2500)).toBe("good");
    expect(getMetricRating("lcp", 2501)).toBe("needs_improvement");
    expect(getMetricRating("lcp", 4000)).toBe("needs_improvement");
    expect(getMetricRating("lcp", 4001)).toBe("poor");
  });

  it("uses each metric's own limits", () => {
    expect(getMetricRating("cls", 0.1)).toBe("good");
    expect(getMetricRating("cls", 0.14)).toBe("needs_improvement");
    expect(getMetricRating("cls", 0.26)).toBe("poor");
    expect(getMetricRating("inp", 96)).toBe("good");
    expect(getMetricRating("inp", 501)).toBe("poor");
    expect(getMetricRating("fcp", 1801)).toBe("needs_improvement");
    expect(getMetricRating("ttfb", 800)).toBe("good");
    expect(getMetricRating("ttfb", 1801)).toBe("poor");
  });
});

describe("formatMetric", () => {
  it("prints the unit the value calls for", () => {
    expect(formatMetric("lcp", 2400)).toBe("2.4s");
    expect(formatMetric("lcp", 1240)).toBe("1.24s");
    expect(formatMetric("inp", 96)).toBe("96ms");
    expect(formatMetric("ttfb", 560)).toBe("560ms");
    expect(formatMetric("cls", 0.14)).toBe("0.14");
  });
});

describe("getRatingSplit", () => {
  it("derives the loads that need improvement and the share of good ones", () => {
    expect(getRatingSplit({ lcp_count: 3327, lcp_good: 1367, lcp_poor: 880 }, "lcp")).toEqual({
      count: 3327,
      good: 1367,
      needs_improvement: 1080,
      poor: 880,
      goodShare: (1367 / 3327) * 100,
    });
  });

  it("reads each metric's own columns", () => {
    const row = { lcp_count: 10, lcp_good: 10, lcp_poor: 0, inp_count: 4, inp_good: 1, inp_poor: 3 };
    expect(getRatingSplit(row, "lcp")?.goodShare).toBe(100);
    expect(getRatingSplit(row, "inp")).toMatchObject({ count: 4, needs_improvement: 0, goodShare: 25 });
  });

  it("has no split when no load reported the metric", () => {
    expect(getRatingSplit({ inp_count: 0, inp_good: 0, inp_poor: 0 }, "inp")).toBeNull();
    expect(getRatingSplit({}, "lcp")).toBeNull();
    expect(getRatingSplit(undefined, "lcp")).toBeNull();
    expect(getRatingSplit(null, "lcp")).toBeNull();
  });

  it("never reports a negative count from inconsistent input", () => {
    expect(getRatingSplit({ cls_count: 5, cls_good: 4, cls_poor: 3 }, "cls")?.needs_improvement).toBe(0);
  });
});

describe("formatShare", () => {
  it("keeps one decimal", () => {
    expect(formatShare(77.34)).toBe("77.3%");
    expect(formatShare(100)).toBe("100.0%");
    expect(formatShare(0)).toBe("0.0%");
  });
});

describe("findOnlyPoorRow", () => {
  const rows = (values: (number | null)[]) => values.map((lcp_p75, index) => ({ pathname: `/page-${index}`, lcp_p75 }));
  const value = (row: { lcp_p75: number | null }) => row.lcp_p75;

  it("finds the single poor row", () => {
    expect(findOnlyPoorRow(rows([2100, 4100, 1800, 3900]), "lcp", value)).toEqual({
      pathname: "/page-1",
      lcp_p75: 4100,
    });
  });

  it("says nothing when no row or several rows are poor", () => {
    expect(findOnlyPoorRow(rows([2100, 3900, 1800]), "lcp", value)).toBeNull();
    expect(findOnlyPoorRow(rows([4100, 4700, 1800]), "lcp", value)).toBeNull();
  });

  it("needs three rated rows to single one out", () => {
    expect(findOnlyPoorRow(rows([4100, 1800]), "lcp", value)).toBeNull();
    expect(findOnlyPoorRow(rows([4100, 1800, null]), "lcp", value)).toBeNull();
    expect(findOnlyPoorRow(rows([4100, 1800, null, 2000]), "lcp", value)?.pathname).toBe("/page-0");
  });

  it("rates against the metric it is asked about", () => {
    // 600 is a poor INP but a good LCP.
    expect(findOnlyPoorRow(rows([600, 100, 150]), "inp", value)?.pathname).toBe("/page-0");
    expect(findOnlyPoorRow(rows([600, 100, 150]), "lcp", value)).toBeNull();
  });
});

describe("PERFORMANCE_METRICS", () => {
  it("lists the Core Web Vitals first", () => {
    expect(PERFORMANCE_METRICS).toEqual(["lcp", "inp", "cls", "fcp", "ttfb"]);
  });
});

describe("annotationsInWindow", () => {
  const annotation = (annotationId: number, date: string, endDate: string | null = null) =>
    ({ annotationId, date, endDate }) as Annotation;
  const window = { min: new Date("2026-09-01T00:00:00Z"), max: new Date("2026-09-30T00:00:00Z") };
  const ids = (annotations: Annotation[]) => annotations.map(a => a.annotationId);

  it("keeps annotations inside the window, including the whole last bucket", () => {
    const annotations = [
      annotation(1, "2026-08-31T23:59:00Z"),
      annotation(2, "2026-09-01T00:00:00Z"),
      annotation(3, "2026-09-15T12:00:00Z"),
      annotation(4, "2026-09-30T14:00:00Z"),
      annotation(5, "2026-10-01T00:00:00Z"),
    ];
    expect(ids(annotationsInWindow(annotations, window, "day"))).toEqual([2, 3, 4]);
  });

  it("keeps a range that began before the window and reaches into it", () => {
    const annotations = [
      annotation(1, "2026-08-20T00:00:00Z", "2026-09-02T00:00:00Z"),
      annotation(2, "2026-08-20T00:00:00Z", "2026-08-25T00:00:00Z"),
    ];
    expect(ids(annotationsInWindow(annotations, window, "day"))).toEqual([1]);
  });

  it("has no lower bound for all time and ends at now when the window is open", () => {
    const now = new Date("2026-09-30T10:00:00Z");
    const annotations = [
      annotation(1, "2021-01-01T00:00:00Z"),
      annotation(2, "2026-09-30T10:30:00Z"),
      annotation(3, "2026-09-30T12:00:00Z"),
    ];
    expect(ids(annotationsInWindow(annotations, {}, "hour", now))).toEqual([1, 2]);
  });
});
