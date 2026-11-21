import { describe, expect, it } from "vitest";
import { customTraits, headlineTraits, traitLabel, traitText } from "./userTraits";

const traits = {
  name: "Mara Lindqvist",
  email: "mara@northpine.io",
  plan: "Pro",
  company: "Northpine",
  seats: 12,
  beta: true,
  notes: "x".repeat(60),
  address: { city: "Stockholm" },
  empty: "",
  role: "Founder",
};

describe("customTraits", () => {
  it("leaves out the traits the header already shows as identity", () => {
    expect(customTraits(traits).map(([key]) => key)).toEqual([
      "plan",
      "company",
      "seats",
      "beta",
      "notes",
      "address",
      "empty",
      "role",
    ]);
  });

  it("is empty without traits", () => {
    expect(customTraits(null)).toEqual([]);
    expect(customTraits(undefined)).toEqual([]);
  });
});

describe("headlineTraits", () => {
  it("takes the first few short scalar traits", () => {
    expect(headlineTraits(traits)).toEqual([
      ["plan", "Pro"],
      ["company", "Northpine"],
      ["seats", 12],
    ]);
  });

  it("skips long, empty and structured values", () => {
    expect(headlineTraits(traits, 10).map(([key]) => key)).toEqual(["plan", "company", "seats", "beta", "role"]);
  });
});

describe("trait text", () => {
  it("labels a key in words", () => {
    expect(traitLabel("signup_plan")).toBe("signup plan");
  });

  it("prints structured values as JSON and nothing for null", () => {
    expect(traitText({ city: "Stockholm" })).toBe('{"city":"Stockholm"}');
    expect(traitText(false)).toBe("false");
    expect(traitText(null)).toBe("");
  });
});
