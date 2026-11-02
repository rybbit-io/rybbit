import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exec: vi.fn(async (_args: { query: string }) => ({})),
  query: vi.fn(),
  queryUserQuery: vi.fn(async () => ({ json: async () => [] })),
}));

vi.mock("./client.js", () => ({
  CLICKHOUSE_QUERY_USER: "rybbit_query",
  clickhouse: { exec: mocks.exec, query: mocks.query },
  clickhouseQuery: { query: mocks.queryUserQuery },
}));

import { buildQueryUserStatements, provisionQueryUser, siteScopeHeaders } from "./queryUser.js";

const rows = (data: unknown[]) => ({ json: async () => data });
const executed = () => mocks.exec.mock.calls.map(([args]) => args.query);

describe("buildQueryUserStatements", () => {
  it("escapes the password and pins every limit as READONLY", () => {
    const { setup } = buildQueryUserStatements("analytics", "rybbit_query", "a&b<c'\"\\d");
    expect(setup.find(s => s.startsWith("CREATE USER"))).toBe(
      "CREATE USER IF NOT EXISTS rybbit_query IDENTIFIED WITH sha256_password BY 'a&b<c\\'\\\"\\\\d'"
    );
    const profile = setup.find(s => s.startsWith("ALTER SETTINGS PROFILE"))!;
    for (const setting of [
      "readonly = 2",
      "max_execution_time = 60",
      "max_memory_usage = 4000000000",
      "max_threads = 4",
      "max_result_rows = 1000",
      "result_overflow_mode = 'break'",
      "max_concurrent_queries_for_user = 8",
      "allow_get_client_http_header = 1",
    ]) {
      expect(profile).toContain(`${setting} READONLY`);
    }
  });

  it("grants SELECT on events only after the site-scope policy, and adds no other policy", () => {
    const { access } = buildQueryUserStatements("analytics", "rybbit_query", "x");
    expect(access).toEqual([
      "REVOKE ALL ON *.* FROM rybbit_query",
      "CREATE ROW POLICY OR REPLACE rybbit_query_site_scope ON analytics.events FOR SELECT USING has(JSONExtract(getClientHTTPHeader('X-Rybbit-Site-Ids'), 'Array(UInt16)'), site_id) TO rybbit_query",
      "GRANT SELECT ON analytics.events TO rybbit_query",
    ]);
  });

  it("rejects non-identifier database or user names", () => {
    expect(() => buildQueryUserStatements("analytics; DROP", "rybbit_query", "x")).toThrow();
    expect(() => buildQueryUserStatements("analytics", "bad name", "x")).toThrow();
  });

  it("encodes the site scope header as a JSON array the row policy can parse", () => {
    expect(siteScopeHeaders([1, 42])).toEqual({ "X-Rybbit-Site-Ids": "[1,42]" });
  });
});

describe("provisionQueryUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLICKHOUSE_DB = "analytics";
  });

  it("installs the row policy and grant when unnamed users keep reading rows", async () => {
    mocks.query.mockResolvedValueOnce(rows([])).mockResolvedValueOnce(rows([{ c: "1" }]));
    await provisionQueryUser();
    const queries = executed();
    expect(queries.some(q => q.startsWith("CREATE ROW POLICY OR REPLACE rybbit_query_site_scope"))).toBe(true);
    expect(queries[queries.length - 1]).toBe("GRANT SELECT ON analytics.events TO rybbit_query");
    // The probe table and its policy are always cleaned up.
    expect(queries.filter(q => q.startsWith("DROP TABLE IF EXISTS analytics.rybbit_row_policy_probe_"))).toHaveLength(
      1
    );
  });

  it("revokes every role granted to the query user, since role policies would widen its scope", async () => {
    mocks.query
      .mockResolvedValueOnce(rows([{ role: "analyst" }, { role: "odd`name" }]))
      .mockResolvedValueOnce(rows([{ c: "1" }]));
    await provisionQueryUser();
    expect(executed()).toEqual(
      expect.arrayContaining(["REVOKE `analyst` FROM rybbit_query", "REVOKE `odd\\`name` FROM rybbit_query"])
    );
  });

  it("leaves the user without access when a row policy would hide events from the main user", async () => {
    mocks.query.mockResolvedValueOnce(rows([])).mockResolvedValueOnce(rows([{ c: "0" }]));
    await provisionQueryUser();
    const queries = executed();
    expect(queries.some(q => q.includes("ON analytics.events FOR SELECT"))).toBe(false);
    expect(queries.some(q => q.startsWith("GRANT"))).toBe(false);
    expect(queries).toContain("REVOKE ALL ON *.* FROM rybbit_query");
    expect(queries).toContain("DROP ROW POLICY IF EXISTS rybbit_query_site_scope ON analytics.events");
  });

  it("never grants when a setup statement fails", async () => {
    mocks.exec.mockRejectedValueOnce(new Error("no access_management"));
    await provisionQueryUser();
    expect(executed().some(q => q.startsWith("GRANT"))).toBe(false);
  });
});

describe("isQueryUserIsolated", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // A factory, so a rejected result isn't created (and flagged unhandled)
  // before the module under test attaches its handlers.
  const check = async (result: () => Promise<unknown>) => {
    mocks.query.mockImplementationOnce(result);
    const { isQueryUserIsolated } = await import("./queryUser.js");
    return isQueryUserIsolated();
  };

  it("is true only with the scope policy and nothing that widens it", async () => {
    expect(await check(async () => rows([{ scoped: "1", widening: "0", roles: "0" }]))).toBe(true);
  });

  it.each([
    ["the scope policy is missing", { scoped: "0", widening: "0", roles: "0" }],
    ["another permissive policy reaches the user", { scoped: "1", widening: "1", roles: "0" }],
    ["the user holds a role", { scoped: "1", widening: "0", roles: "1" }],
  ])("is false when %s", async (_label, row) => {
    expect(await check(async () => rows([row]))).toBe(false);
  });

  it("fails closed when the check errors", async () => {
    expect(await check(() => Promise.reject(new Error("down")))).toBe(false);
  });
});
