import { describe, expect, it } from "vitest";
import { ClickHouseError } from "@clickhouse/client";
import { buildQueryUserStatements, classifyClickHouseFailure } from "./queryUser.js";

it("classifies failures without logging credential-bearing SQL messages", () => {
  expect(
    classifyClickHouseFailure(new ClickHouseError({ code: "497", type: "ACCESS_DENIED", message: "SQL with secret" }))
  ).toEqual({ kind: "clickhouse", code: "497", type: "ACCESS_DENIED" });
  expect(classifyClickHouseFailure(new Error("URL with secret"))).toEqual({ kind: "transport", name: "Error" });
  expect(classifyClickHouseFailure("secret")).toEqual({ kind: "unknown" });
});

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
    ]) {
      expect(profile).toContain(`${setting} READONLY`);
    }
    expect(profile).toContain("max_memory_usage_for_user = 8000000000 READONLY");
    expect(statements).toContain("REVOKE ALL ON *.* FROM rybbit_query");
    expect(statements).toContain("REVOKE ALL FROM rybbit_query");
    expect(statements).toContain("ALTER USER rybbit_query DEFAULT ROLE NONE");
    expect(statements[statements.length - 1]).toBe("GRANT SELECT ON analytics.events TO rybbit_query");
  });

  it("rejects non-identifier database or user names", () => {
    expect(() => buildQueryUserStatements("analytics; DROP", "rybbit_query", "x")).toThrow();
    expect(() => buildQueryUserStatements("analytics", "bad name", "x")).toThrow();
  });
});
