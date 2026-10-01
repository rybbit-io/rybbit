import { describe, expect, it, vi } from "vitest";

// usePivotHref pulls in the store and the router; withRoute needs neither.
vi.mock("../../../../../hooks/usePivotHref", () => ({ usePivotHref: vi.fn() }));

import { userFilter, withRoute } from "./profileLinks";

describe("withRoute", () => {
  it("swaps the page and keeps the query string", () => {
    expect(withRoute("/42/sessions?wellKnown=last-30-days&filters=x", "goals")).toBe(
      "/42/goals?wellKnown=last-30-days&filters=x"
    );
  });

  it("stays inside a private link", () => {
    expect(withRoute("/42/abc123def456/sessions?stat=users", "journeys")).toBe("/42/abc123def456/journeys?stat=users");
  });

  it("handles a link with no query string", () => {
    expect(withRoute("/42/sessions", "events")).toBe("/42/events");
  });

  it("only touches the route segment, not a value that happens to contain it", () => {
    expect(withRoute("/42/sessions?filters=%2Fsessions%2Fnew", "pages")).toBe("/42/pages?filters=%2Fsessions%2Fnew");
  });
});

describe("userFilter", () => {
  it("is an equals filter on user_id", () => {
    expect(userFilter("usr_8f2kq1")).toEqual({ parameter: "user_id", type: "equals", value: ["usr_8f2kq1"] });
  });
});
