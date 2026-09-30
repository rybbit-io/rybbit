import { describe, expect, it } from "vitest";
import { withEnglishFallback } from "./messages";

describe("locale messages", () => {
  it("fills missing and empty translations while retaining translated ICU messages", () => {
    const english = { empty: "Delete", missing: "Save", count: "{count} sites" };
    expect(withEnglishFallback(english, { empty: "  ", count: "{count} Seiten" })).toEqual({
      empty: "Delete",
      missing: "Save",
      count: "{count} Seiten",
    });
    expect(english.empty).toBe("Delete");
  });
});
