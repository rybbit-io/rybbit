import { describe, expect, it } from "vitest";

import { formatSection, getPageFilters, getRowId, getTrendKeys } from "./pageIdentity";

describe("page identity", () => {
  it("tells a page from the section of the same name", () => {
    expect(getRowId({ kind: "page", key: "/docs" })).toBe("page:/docs");
    expect(getRowId({ kind: "section", key: "/docs" })).toBe("section:/docs");
  });

  it("writes sections with a trailing slash", () => {
    expect(formatSection("/docs")).toBe("/docs/");
    expect(formatSection("/")).toBe("/");
  });

  it("filters by path, or by entry or exit page on those lists", () => {
    expect(getPageFilters("/pricing", "all")).toEqual([{ parameter: "pathname", value: ["/pricing"], type: "equals" }]);
    expect(getPageFilters("/pricing", "entry")).toEqual([
      { parameter: "entry_page", value: ["/pricing"], type: "equals" },
    ]);
    expect(getPageFilters("/pricing", "exit")).toEqual([
      { parameter: "exit_page", value: ["/pricing"], type: "equals" },
    ]);
  });

  it("splits a batch of rows into paths and sections", () => {
    expect(
      getTrendKeys([
        { kind: "page", key: "/" },
        { kind: "section", key: "/docs" },
        { kind: "page", key: "/pricing" },
      ])
    ).toEqual({ paths: ["/", "/pricing"], sections: ["/docs"] });
  });
});
