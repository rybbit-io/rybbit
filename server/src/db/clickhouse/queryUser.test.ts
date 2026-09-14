import { describe, expect, it } from "vitest";
import { buildQueryUserStatements } from "./queryUser.js";

describe("buildQueryUserStatements", () => {
  it("escapes the password and pins every limit as READONLY", () => {
    const statements = buildQueryUserStatements("analytics", "rybbit_query", "a&b<c'\"\\d");
    expect(statements.find(s => s.startsWith("CREATE USER"))).toBe(
      "CREATE USER IF NOT EXISTS rybbit_query IDENTIFIED WITH sha256_password BY 'a&b<c\\'\\\"\\\\d'"
    );
    const profile = statements.find(s => s.startsWith("ALTER SETTINGS PROFILE"))!;
    for (const setting of [
      "readonly = 2",
      "max_execution_time = 10",
      "max_memory_usage = 4000000000",
      "max_threads = 4",
      "max_result_rows = 1000",
      "result_overflow_mode = 'break'",
      "max_concurrent_queries_for_user = 8",
    ]) {
      expect(profile).toContain(`${setting} READONLY`);
    }
    expect(statements[statements.length - 2]).toBe("REVOKE ALL ON *.* FROM rybbit_query");
    expect(statements[statements.length - 1]).toBe("GRANT SELECT ON analytics.events TO rybbit_query");
  });

  it("rejects non-identifier database or user names", () => {
    expect(() => buildQueryUserStatements("analytics; DROP", "rybbit_query", "x")).toThrow();
    expect(() => buildQueryUserStatements("analytics", "bad name", "x")).toThrow();
  });
});
