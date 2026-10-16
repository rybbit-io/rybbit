import { describe, expect, it } from "vitest";
import { buildQueryUserStatements, siteScopeHeaders } from "./queryUser.js";

describe("buildQueryUserStatements", () => {
  it("escapes the password and pins every limit as READONLY", () => {
    const statements = buildQueryUserStatements("analytics", "rybbit_query", "a&b<c'\"\\d");
    expect(statements.find(s => s.startsWith("CREATE USER"))).toBe(
      "CREATE USER IF NOT EXISTS rybbit_query IDENTIFIED WITH sha256_password BY 'a&b<c\\'\\\"\\\\d'"
    );
    const profile = statements.find(s => s.startsWith("ALTER SETTINGS PROFILE"))!;
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
    expect(statements.slice(-4)).toEqual([
      "REVOKE ALL ON *.* FROM rybbit_query",
      "CREATE ROW POLICY OR REPLACE rybbit_query_site_scope ON analytics.events FOR SELECT USING has(JSONExtract(getClientHTTPHeader('X-Rybbit-Site-Ids'), 'Array(UInt16)'), site_id) TO rybbit_query",
      "CREATE ROW POLICY OR REPLACE rybbit_query_others_unrestricted ON analytics.events FOR SELECT USING 1 TO ALL EXCEPT rybbit_query",
      "GRANT SELECT ON analytics.events TO rybbit_query",
    ]);
  });

  it("encodes the site scope header as a JSON array the row policy can parse", () => {
    expect(siteScopeHeaders([1, 42])).toEqual({ "X-Rybbit-Site-Ids": "[1,42]" });
  });

  it("rejects non-identifier database or user names", () => {
    expect(() => buildQueryUserStatements("analytics; DROP", "rybbit_query", "x")).toThrow();
    expect(() => buildQueryUserStatements("analytics", "bad name", "x")).toThrow();
  });
});
