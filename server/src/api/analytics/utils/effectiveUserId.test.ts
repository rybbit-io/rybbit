import { describe, it, expect } from "vitest";
import { doesNotMatchUser, EFFECTIVE_SESSION_USER_ID, effectiveUserId, matchesUser } from "./effectiveUserId.js";

describe("effectiveUserId", () => {
  it("falls back from the identity to the fingerprint with no alias", () => {
    expect(effectiveUserId()).toBe("COALESCE(NULLIF(identified_user_id, ''), user_id)");
  });

  it("treats an empty alias as no alias", () => {
    expect(effectiveUserId("")).toBe("COALESCE(NULLIF(identified_user_id, ''), user_id)");
  });

  it("prefixes both columns with the table alias", () => {
    expect(effectiveUserId("e")).toBe("COALESCE(NULLIF(e.identified_user_id, ''), e.user_id)");
  });
});

describe("EFFECTIVE_SESSION_USER_ID", () => {
  it("is the session-grain aggregate form of the same fallback", () => {
    expect(EFFECTIVE_SESSION_USER_ID).toBe(
      "COALESCE(NULLIF(anyIf(identified_user_id, identified_user_id != ''), ''), anyLast(user_id))"
    );
  });
});

describe("matchesUser", () => {
  it("matches an identified user, or a device only while it is still anonymous", () => {
    // Several people behind one corporate proxy share a fingerprint, so an
    // unguarded user_id match would sweep in every identified user on it.
    expect(matchesUser("{userId:String}")).toBe(
      "(identified_user_id = {userId:String} OR (user_id = {userId:String} AND identified_user_id = ''))"
    );
  });

  it("treats an empty alias as no alias", () => {
    expect(matchesUser("{userId:String}", "")).toBe(matchesUser("{userId:String}"));
  });

  it("prefixes every column reference with the table alias", () => {
    expect(matchesUser("{userId:String}", "e")).toBe(
      "(e.identified_user_id = {userId:String} OR (e.user_id = {userId:String} AND e.identified_user_id = ''))"
    );
  });
});

describe("doesNotMatchUser", () => {
  it("renders the full predicate with no alias", () => {
    expect(doesNotMatchUser("{userId:String}")).toBe(
      "NOT (identified_user_id = {userId:String} OR (user_id = {userId:String} AND identified_user_id = ''))"
    );
  });

  it("partitions the rows together with matchesUser", () => {
    // equals/not_equals filters must be exact complements.
    for (const alias of ["", "e", "events"]) {
      expect(doesNotMatchUser("{userId:String}", alias)).toBe(`NOT ${matchesUser("{userId:String}", alias)}`);
    }
  });
});
