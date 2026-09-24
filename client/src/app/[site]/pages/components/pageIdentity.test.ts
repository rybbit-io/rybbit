import { describe, expect, it } from "vitest";

import type { PageTitleItem } from "@/api/analytics/endpoints";
import { getPageItemFilters, getPageItemKey } from "./pageIdentity";

const pageItem = (overrides: Partial<PageTitleItem> = {}): PageTitleItem => ({
  value: "Pricing",
  pathname: "/pricing",
  count: 1,
  percentage: 100,
  ...overrides,
});

describe("page identity", () => {
  it("identifies and filters titled rows by page title", () => {
    const item = pageItem();

    expect(getPageItemKey(item)).toBe("title:Pricing");
    expect(getPageItemFilters(item)).toEqual([{ parameter: "page_title", value: ["Pricing"], type: "equals" }]);
  });

  it("identifies and filters untitled rows by pathname", () => {
    const item = pageItem({ value: "", pathname: "/docs/getting-started" });

    expect(getPageItemKey(item)).toBe("pathname:/docs/getting-started");
    expect(getPageItemFilters(item)).toEqual([
      { parameter: "page_title", value: [], type: "is_null" },
      { parameter: "pathname", value: ["/docs/getting-started"], type: "equals" },
    ]);
  });
});
