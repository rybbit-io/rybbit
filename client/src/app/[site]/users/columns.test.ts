import { describe, expect, it } from "vitest";
import {
  columnId,
  DEFAULT_BUILT_IN,
  defaultTraitColumns,
  formatTraitValue,
  parseColumnSelection,
  tableMinWidth,
  toggleBuiltIn,
  toggleTrait,
  USER_COLUMN_MIN_WIDTH,
  visibleColumns,
} from "./columns";

describe("visibleColumns", () => {
  it("puts traits first, then the built-in columns in table order whatever order they were chosen in", () => {
    const columns = visibleColumns({ builtIn: ["device", "sessions", "last_seen"], traits: ["plan", "company"] });
    expect(columns.map(columnId)).toEqual(["trait:plan", "trait:company", "last_seen", "sessions", "device"]);
  });

  it("is only as wide as the user column when nothing else is shown", () => {
    expect(tableMinWidth(visibleColumns({ builtIn: [], traits: [] }))).toBe(USER_COLUMN_MIN_WIDTH);
  });

  it("fits the default columns and two traits in the page's desktop content width", () => {
    // 1440px viewport, less the sidebar and the page padding.
    expect(tableMinWidth(visibleColumns({ builtIn: DEFAULT_BUILT_IN, traits: ["a", "b"] }))).toBeLessThanOrEqual(1138);
  });
});

describe("defaultTraitColumns", () => {
  const key = (name: string, userCount: number) => ({ key: name, userCount });

  it("takes the most common traits, skipping the ones the user cell already shows", () => {
    const keys = [
      key("email", 90),
      key("Name", 90),
      key("plan", 80),
      key("username", 70),
      key("company", 60),
      key("role", 5),
    ];
    expect(defaultTraitColumns(keys)).toEqual(["plan", "company"]);
  });

  it("is empty for a site with no traits", () => {
    expect(defaultTraitColumns([])).toEqual([]);
  });
});

describe("toggling columns", () => {
  const selection = { builtIn: DEFAULT_BUILT_IN, traits: ["plan"] };

  it("adds and removes a built-in column without touching the traits", () => {
    const added = toggleBuiltIn(selection, "first_seen");
    expect(added.builtIn).toContain("first_seen");
    expect(toggleBuiltIn(added, "first_seen")).toEqual(selection);
  });

  it("adds and removes a trait without touching the built-ins", () => {
    expect(toggleTrait(selection, "role")).toEqual({ builtIn: DEFAULT_BUILT_IN, traits: ["plan", "role"] });
    expect(toggleTrait(selection, "plan")).toEqual({ builtIn: DEFAULT_BUILT_IN, traits: [] });
  });
});

describe("parseColumnSelection", () => {
  it("reads back what was stored", () => {
    const selection = { builtIn: ["sessions", "device"], traits: ["plan"] };
    expect(parseColumnSelection(JSON.stringify(selection))).toEqual(selection);
  });

  it("drops columns this version does not have", () => {
    expect(
      parseColumnSelection(JSON.stringify({ builtIn: ["sessions", "bounce_rate", 7], traits: ["plan", null] }))
    ).toEqual({ builtIn: ["sessions"], traits: ["plan"] });
  });

  it.each([null, "", "not json", "[]", "null", JSON.stringify({ builtIn: "sessions", traits: [] })])(
    "falls back to the defaults for %j",
    raw => {
      expect(parseColumnSelection(raw)).toBeNull();
    }
  );
});

describe("formatTraitValue", () => {
  it.each([
    ["Pro", "Pro"],
    [42, "42"],
    [false, "false"],
    [0, "0"],
    [{ tier: 2 }, '{"tier":2}'],
    [["a", "b"], '["a","b"]'],
  ])("shows %j as %s", (value, expected) => {
    expect(formatTraitValue(value)).toBe(expected);
  });

  it.each([null, undefined, ""])("has nothing to show for %j", value => {
    expect(formatTraitValue(value)).toBeNull();
  });
});
