import { describe, expect, it } from "vitest";
import { fold, rank, scoreOne } from "./rank";

const labels = (items: { label: string }[]) => items.map(item => item.label);
const items = (...names: string[]) => names.map(label => ({ label }));

describe("scoreOne", () => {
  it("returns -1 when the query is not an in-order subsequence", () => {
    expect(scoreOne("Sessions", "xyz")).toBe(-1);
    expect(scoreOne("Sessions", "sne")).toBe(-1);
  });

  it("rewards a match at the very start and consecutive characters", () => {
    // s (start: 2 + 12), e (run of 1: 2 + 4), s (run of 2: 2 + 8)
    expect(scoreOne("Sessions", "ses")).toBe(30);
    // s mid-word (2), e right after (2 + 4), s after a gap (2)
    expect(scoreOne("Users", "ses")).toBe(10);
  });

  it("scores a run above the same letters scattered mid-word", () => {
    expect(scoreOne("sets", "set")).toBeGreaterThan(scoreOne("sxext", "set"));
  });

  it("rewards letters that start words, so initials find a label", () => {
    // l (start: 2 + 12), w after a space (2 + 8)
    expect(scoreOne("Last Week", "lw")).toBe(24);
    expect(scoreOne("Yellow", "lw")).toBe(4);
  });
});

describe("fold", () => {
  it("lower-cases and drops accents", () => {
    expect(fold("Übersicht Événements")).toBe("ubersicht evenements");
  });
});

describe("rank", () => {
  it("returns every item in its original order for an empty or blank query", () => {
    const list = items("Main", "Globe", "Sessions");
    expect(rank(list, "")).toEqual(list);
    expect(rank(list, "   ")).toEqual(list);
    expect(rank(list, "")).not.toBe(list);
  });

  it("drops items that do not match", () => {
    expect(labels(rank(items("Main", "Globe"), "xyz"))).toEqual([]);
  });

  it("puts the strongest match first", () => {
    expect(labels(rank(items("Users", "Events", "Sessions"), "ses"))).toEqual(["Sessions", "Users"]);
  });

  it("is case-insensitive, accent-insensitive and trims the query", () => {
    expect(labels(rank(items("Globe", "Übersicht"), "  UBER "))).toEqual(["Übersicht"]);
  });

  it("matches keywords, a little below the same match in a label", () => {
    const list = [{ label: "Cohorts", keywords: "retention" }, { label: "Retention" }];
    expect(labels(rank(list, "ret"))).toEqual(["Retention", "Cohorts"]);
  });

  it("ignores a single keyword letter in the middle of a word", () => {
    // Upstream behavior: the keyword penalty pushes a lone mid-word hit below zero.
    expect(rank([{ label: "Main", keywords: "overview" }], "v")).toEqual([]);
    expect(labels(rank([{ label: "Main", keywords: "overview" }], "o"))).toEqual(["Main"]);
  });

  it("breaks a tie with the shorter label", () => {
    expect(labels(rank(items("Goals overview", "Goals"), "goa"))).toEqual(["Goals", "Goals overview"]);
  });

  it("keeps the input order for equal scores", () => {
    expect(labels(rank(items("Dusk", "Dark"), "d"))).toEqual(["Dusk", "Dark"]);
    expect(labels(rank(items("Dark", "Dusk"), "d"))).toEqual(["Dark", "Dusk"]);
  });

  it("re-ranks as the query grows", () => {
    const list = items("Sessions", "Settings", "Site settings");
    expect(labels(rank(list, "s"))).toEqual(["Sessions", "Settings", "Site settings"]);
    // The second s starts a word only in "Site settings", which jumps to the top.
    expect(labels(rank(list, "ss"))).toEqual(["Site settings", "Sessions", "Settings"]);
    expect(labels(rank(list, "set"))).toEqual(["Settings", "Site settings"]);
  });
});
