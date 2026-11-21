import { describe, expect, it } from "vitest";
import { narrowingParams } from "./useGetUsers";

const sent = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));

describe("narrowingParams", () => {
  it("sends nothing for an unnarrowed list", () => {
    expect(sent(narrowingParams({}))).toEqual({});
    expect(sent(narrowingParams({ identifiedOnly: false, newOnly: false, search: "", searchField: "name" }))).toEqual(
      {}
    );
  });

  it("names the quick filters as the API does", () => {
    expect(sent(narrowingParams({ identifiedOnly: true, newOnly: true, minSessions: 4 }))).toEqual({
      identified_only: true,
      new_only: true,
      min_sessions: 4,
    });
  });

  it("sends the search field only with a search", () => {
    expect(sent(narrowingParams({ search: "mara", searchField: "email" }))).toEqual({
      search: "mara",
      search_field: "email",
    });
  });

  it("asks for a trait value, including the empty one", () => {
    expect(sent(narrowingParams({ traitGroup: { key: "plan", value: "Pro" } }))).toEqual({
      trait_key: "plan",
      trait_value: "Pro",
    });
    expect(sent(narrowingParams({ traitGroup: { key: "plan", value: "" } }))).toEqual({
      trait_key: "plan",
      trait_value: "",
    });
  });

  it("asks for the users without the trait", () => {
    expect(sent(narrowingParams({ traitGroup: { key: "plan", missing: true } }))).toEqual({
      trait_key: "plan",
      trait_missing: true,
    });
  });
});
