import { afterEach, describe, expect, it, vi } from "vitest";

import { slugFromName } from "./orgSlug";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("slugFromName", () => {
  it("keeps the name's letters and digits and adds a random suffix", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    expect(slugFromName("Acme Inc.")).toBe(`acme-inc-${(0.123456789).toString(36).slice(2, 6)}`);
  });

  it("gives the same name a different slug each time, so common names don't collide", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.111111).mockReturnValueOnce(0.999999);

    expect(slugFromName("Test")).not.toBe(slugFromName("Test"));
  });

  it("is never empty, even for a name with no ASCII letters or digits", () => {
    expect(slugFromName("测试公司")).toMatch(/^org-[a-z0-9]+$/);
    expect(slugFromName("株式会社 ラビット")).toMatch(/^org-[a-z0-9]+$/);
  });

  it("collapses punctuation and trims leading and trailing separators", () => {
    expect(slugFromName("  --Hello,  World!--  ")).toMatch(/^hello-world-[a-z0-9]+$/);
  });
});
