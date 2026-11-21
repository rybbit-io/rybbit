import { describe, expect, it } from "vitest";
import { paletteEntries, type PaletteEntry } from "./entries";

type Item = { id: string; label: string; group: "site" | "sites" | "theme" };

const item = (group: Item["group"], label: string): Item => ({ id: `${group}:${label}`, label, group });

const ITEMS: Item[] = [
  item("site", "Main"),
  item("site", "Sessions"),
  item("sites", "docs.rybbit.com"),
  item("sites", "shop.example"),
  item("sites", "blog.example"),
  item("theme", "Dark"),
];

const describeEntries = (entries: PaletteEntry<Item>[]) =>
  entries.map(entry => (entry.kind === "heading" ? `# ${entry.group}` : entry.item.label));

describe("paletteEntries", () => {
  it("lists every row under a heading per group when there is no query", () => {
    const { entries, total } = paletteEntries(ITEMS, "");
    expect(describeEntries(entries)).toEqual([
      "# site",
      "Main",
      "Sessions",
      "# sites",
      "docs.rybbit.com",
      "shop.example",
      "blog.example",
      "# theme",
      "Dark",
    ]);
    expect(total).toBe(6);
  });

  it("caps a group before the user types", () => {
    const { entries } = paletteEntries(ITEMS, "", { groupLimits: { sites: 2 } });
    expect(describeEntries(entries)).toEqual([
      "# site",
      "Main",
      "Sessions",
      "# sites",
      "docs.rybbit.com",
      "shop.example",
      "# theme",
      "Dark",
    ]);
  });

  it("drops the heading of a group that shows no rows", () => {
    const { entries } = paletteEntries(ITEMS, "", { groupLimits: { theme: 0 } });
    expect(describeEntries(entries)).not.toContain("# theme");
  });

  it("ranks one flat list across groups, ignoring group caps, once there is a query", () => {
    const { entries, total } = paletteEntries(ITEMS, "s", { groupLimits: { sites: 1 } });
    expect(entries.every(entry => entry.kind === "row")).toBe(true);
    expect(describeEntries(entries)).toEqual(["Sessions", "shop.example", "docs.rybbit.com"]);
    expect(total).toBe(3);
  });

  it("renders at most maxResults rows but counts every match", () => {
    const { entries, total } = paletteEntries(ITEMS, "s", { maxResults: 2 });
    expect(describeEntries(entries)).toEqual(["Sessions", "shop.example"]);
    expect(total).toBe(3);
  });
});
