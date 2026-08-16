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

  it("prefixes a multi-character alias", () => {
    expect(effectiveUserId("events")).toBe("COALESCE(NULLIF(events.identified_user_id, ''), events.user_id)");
  });

  it("appends exactly one dot, so a caller-supplied dotted alias would double up", () => {
    // Pinned behavior: the alias is interpolated verbatim before the dot.
    expect(effectiveUserId("db.events")).toBe("COALESCE(NULLIF(db.events.identified_user_id, ''), db.events.user_id)");
  });

  it("guards the fallback on empty string, not NULL", () => {
    // NULLIF(..., '') is what makes a site that never calls identify() collapse
    // to plain user_id, so the '' literal is load-bearing.
    expect(effectiveUserId()).toContain("NULLIF(identified_user_id, '')");
  });
});

describe("EFFECTIVE_SESSION_USER_ID", () => {
  it("is the session-grain aggregate form of the same fallback", () => {
    expect(EFFECTIVE_SESSION_USER_ID).toBe(
      "COALESCE(NULLIF(anyIf(identified_user_id, identified_user_id != ''), ''), anyLast(user_id))"
    );
  });

  it("takes any non-empty identity in the session before falling back", () => {
    expect(EFFECTIVE_SESSION_USER_ID).toContain("anyIf(identified_user_id, identified_user_id != '')");
    expect(EFFECTIVE_SESSION_USER_ID).toContain("anyLast(user_id)");
  });

  it("is a constant, not an alias-aware builder", () => {
    // It is designed to be used inside a GROUP BY session_id aggregation on a
    // single unaliased events scan.
    expect(typeof EFFECTIVE_SESSION_USER_ID).toBe("string");
    expect(EFFECTIVE_SESSION_USER_ID).not.toContain(".");
  });

  it("uses the same COALESCE/NULLIF shape as the event-level key", () => {
    expect(EFFECTIVE_SESSION_USER_ID.startsWith("COALESCE(NULLIF(")).toBe(true);
    expect(effectiveUserId().startsWith("COALESCE(NULLIF(")).toBe(true);
  });
});

describe("matchesUser", () => {
  it("matches an identified user, or a device only while it is still anonymous", () => {
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

  it("interpolates an escaped literal verbatim", () => {
    expect(matchesUser("'user123'")).toBe(
      "(identified_user_id = 'user123' OR (user_id = 'user123' AND identified_user_id = ''))"
    );
  });

  it("guards the fingerprint branch so a shared device does not sweep in identified users", () => {
    // The regression this exists for: several people behind one corporate proxy
    // share a fingerprint, so an unguarded user_id match would return all of them.
    const sql = matchesUser("'fp1'");
    expect(sql).toContain("user_id = 'fp1' AND identified_user_id = ''");
    expect(sql).not.toMatch(/user_id = 'fp1'\)\s*$/);
  });

  it("keeps the alias out of the value expression", () => {
    const sql = matchesUser("{userId:String}", "e");
    expect(sql).not.toContain("e.{userId:String}");
    expect(sql.match(/\{userId:String\}/g)?.length).toBe(2);
    expect(sql.match(/e\./g)?.length).toBe(3);
  });
});

describe("doesNotMatchUser", () => {
  it("is the exact negation of matchesUser", () => {
    expect(doesNotMatchUser("{userId:String}")).toBe(`NOT ${matchesUser("{userId:String}")}`);
  });

  it("renders the full predicate with no alias", () => {
    expect(doesNotMatchUser("{userId:String}")).toBe(
      "NOT (identified_user_id = {userId:String} OR (user_id = {userId:String} AND identified_user_id = ''))"
    );
  });

  it("passes the alias through to matchesUser", () => {
    expect(doesNotMatchUser("{userId:String}", "e")).toBe(`NOT ${matchesUser("{userId:String}", "e")}`);
    expect(doesNotMatchUser("{userId:String}", "e")).toBe(
      "NOT (e.identified_user_id = {userId:String} OR (e.user_id = {userId:String} AND e.identified_user_id = ''))"
    );
  });

  it("wraps the whole predicate in parentheses so NOT binds to all of it", () => {
    const sql = doesNotMatchUser("'user123'");
    expect(sql.startsWith("NOT (")).toBe(true);
    expect(sql.endsWith(")")).toBe(true);
  });

  it("partitions the rows together with matchesUser", () => {
    // equals/not_equals filters must be exact complements.
    for (const alias of ["", "e", "events"]) {
      expect(doesNotMatchUser("{userId:String}", alias)).toBe(`NOT ${matchesUser("{userId:String}", alias)}`);
    }
  });
});
