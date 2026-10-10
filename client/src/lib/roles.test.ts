import { describe, expect, it } from "vitest";

import { siteRolesAbove } from "./roles";

describe("siteRolesAbove", () => {
  it("offers only the site roles that would raise the organization role, lowest first", () => {
    expect(siteRolesAbove("viewer")).toEqual(["member", "editor"]);
    expect(siteRolesAbove("member")).toEqual(["editor"]);
  });

  it("offers nothing to roles a site grant can't raise", () => {
    expect(siteRolesAbove("editor")).toEqual([]);
    expect(siteRolesAbove("admin")).toEqual([]);
    expect(siteRolesAbove("owner")).toEqual([]);
    expect(siteRolesAbove("unknown")).toEqual([]);
  });
});
