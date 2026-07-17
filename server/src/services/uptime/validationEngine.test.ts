import { describe, expect, it } from "vitest";
import { applyValidationRules } from "./validationEngine.js";
import { HttpCheckResult, ValidationRule } from "./types.js";

function createResult(overrides: Partial<HttpCheckResult> = {}): HttpCheckResult {
  return {
    status: "success",
    statusCode: 200,
    responseTimeMs: 150,
    timing: {},
    headers: {},
    bodySizeBytes: 1024,
    validationErrors: [],
    ...overrides,
  };
}

describe("applyValidationRules", () => {
  it("returns no errors for an empty rule list", () => {
    expect(applyValidationRules(createResult(), [])).toEqual([]);
  });

  describe("status_code", () => {
    it("passes and fails 'equals'", () => {
      const rule: ValidationRule = { type: "status_code", operator: "equals", value: 200 };
      expect(applyValidationRules(createResult({ statusCode: 200 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ statusCode: 500 }), [rule])).toEqual([
        "Status code 500 does not equal 200",
      ]);
    });

    it("passes and fails 'not_equals'", () => {
      const rule: ValidationRule = { type: "status_code", operator: "not_equals", value: 500 };
      expect(applyValidationRules(createResult({ statusCode: 200 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ statusCode: 500 }), [rule])).toEqual(["Status code 500 equals 500"]);
    });

    it("passes and fails 'in' with an array value", () => {
      const rule: ValidationRule = { type: "status_code", operator: "in", value: [200, 201, 204] };
      expect(applyValidationRules(createResult({ statusCode: 204 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ statusCode: 404 }), [rule])).toEqual([
        "Status code 404 is not in [200, 201, 204]",
      ]);
    });

    it("passes and fails 'not_in' with an array value", () => {
      const rule: ValidationRule = { type: "status_code", operator: "not_in", value: [500, 502, 503] };
      expect(applyValidationRules(createResult({ statusCode: 200 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ statusCode: 502 }), [rule])).toEqual([
        "Status code 502 is in [500, 502, 503]",
      ]);
    });

    it("fails explicitly when the status code is falsy", () => {
      // Fail-closed: a missing status code (connection-level failure) or a literal 0
      // means no response was received, so a status_code rule must fail explicitly
      // rather than silently pass.
      const rule: ValidationRule = { type: "status_code", operator: "equals", value: 200 };
      expect(applyValidationRules(createResult({ statusCode: undefined }), [rule])).toEqual([
        "No status code available to validate",
      ]);
      expect(applyValidationRules(createResult({ statusCode: 0 }), [rule])).toEqual([
        "No status code available to validate",
      ]);
    });

    it("fails 'in' and 'not_in' when the value is not an array", () => {
      // Fail-closed: a scalar operand on in/not_in is a misconfigured rule and must
      // surface as a validation failure instead of silently passing.
      expect(
        applyValidationRules(createResult({ statusCode: 404 }), [{ type: "status_code", operator: "in", value: 200 }])
      ).toEqual(['Validation rule misconfigured: "in" operator requires an array value']);
      expect(
        applyValidationRules(createResult({ statusCode: 500 }), [
          { type: "status_code", operator: "not_in", value: 500 },
        ])
      ).toEqual(['Validation rule misconfigured: "not_in" operator requires an array value']);
    });
  });

  describe("response_time", () => {
    it("'less_than' fails exactly at the threshold and passes just below", () => {
      const rule: ValidationRule = { type: "response_time", operator: "less_than", value: 500 };
      expect(applyValidationRules(createResult({ responseTimeMs: 499 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ responseTimeMs: 500 }), [rule])).toEqual([
        "Response time 500ms is not less than 500ms",
      ]);
      expect(applyValidationRules(createResult({ responseTimeMs: 501 }), [rule])).toEqual([
        "Response time 501ms is not less than 500ms",
      ]);
    });

    it("'greater_than' fails exactly at the threshold and passes just above", () => {
      const rule: ValidationRule = { type: "response_time", operator: "greater_than", value: 100 };
      expect(applyValidationRules(createResult({ responseTimeMs: 101 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ responseTimeMs: 100 }), [rule])).toEqual([
        "Response time 100ms is not greater than 100ms",
      ]);
      expect(applyValidationRules(createResult({ responseTimeMs: 99 }), [rule])).toEqual([
        "Response time 99ms is not greater than 100ms",
      ]);
    });
  });

  describe("response_size", () => {
    it("'less_than' fails exactly at the threshold and passes just below", () => {
      const rule: ValidationRule = { type: "response_size", operator: "less_than", value: 2048 };
      expect(applyValidationRules(createResult({ bodySizeBytes: 2047 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ bodySizeBytes: 2048 }), [rule])).toEqual([
        "Response size 2048 bytes is not less than 2048 bytes",
      ]);
    });

    it("'greater_than' fails exactly at the threshold and passes just above", () => {
      const rule: ValidationRule = { type: "response_size", operator: "greater_than", value: 100 };
      expect(applyValidationRules(createResult({ bodySizeBytes: 101 }), [rule])).toEqual([]);
      expect(applyValidationRules(createResult({ bodySizeBytes: 100 }), [rule])).toEqual([
        "Response size 100 bytes is not greater than 100 bytes",
      ]);
    });
  });

  describe("response_body_contains", () => {
    it("passes when the body contains the value and fails when it does not", () => {
      const rule: ValidationRule = { type: "response_body_contains", value: "OK" };
      expect(applyValidationRules(createResult(), [rule], "status: OK")).toEqual([]);
      expect(applyValidationRules(createResult(), [rule], "status: down")).toEqual([
        'Response body does not contain "OK"',
      ]);
    });

    it("is case sensitive by default and case insensitive when caseSensitive is false", () => {
      expect(applyValidationRules(createResult(), [{ type: "response_body_contains", value: "OK" }], "ok")).toEqual([
        'Response body does not contain "OK"',
      ]);
      expect(
        applyValidationRules(
          createResult(),
          [{ type: "response_body_contains", value: "OK", caseSensitive: false }],
          "ok"
        )
      ).toEqual([]);
    });

    it("fails with a dedicated error when the body is empty", () => {
      const rule: ValidationRule = { type: "response_body_contains", value: "OK" };
      expect(applyValidationRules(createResult(), [rule], undefined)).toEqual(["Response body is empty"]);
      expect(applyValidationRules(createResult(), [rule], "")).toEqual(["Response body is empty"]);
    });
  });

  describe("response_body_not_contains", () => {
    it("passes when absent and fails when present", () => {
      const rule: ValidationRule = { type: "response_body_not_contains", value: "error" };
      expect(applyValidationRules(createResult(), [rule], "all good")).toEqual([]);
      expect(applyValidationRules(createResult(), [rule], "fatal error occurred")).toEqual([
        'Response body contains "error"',
      ]);
    });

    it("passes when the body is empty", () => {
      const rule: ValidationRule = { type: "response_body_not_contains", value: "error" };
      expect(applyValidationRules(createResult(), [rule], undefined)).toEqual([]);
    });

    it("respects caseSensitive: false", () => {
      expect(
        applyValidationRules(
          createResult(),
          [{ type: "response_body_not_contains", value: "ERROR", caseSensitive: false }],
          "an error occurred"
        )
      ).toEqual(['Response body contains "ERROR"']);
    });
  });

  describe("header_exists", () => {
    it("matches header names case-insensitively", () => {
      const result = createResult({ headers: { "Content-Type": "application/json" } });
      expect(applyValidationRules(result, [{ type: "header_exists", header: "content-type" }])).toEqual([]);
      expect(applyValidationRules(result, [{ type: "header_exists", header: "CONTENT-TYPE" }])).toEqual([]);
    });

    it("fails when the header is missing", () => {
      const result = createResult({ headers: { "Content-Type": "application/json" } });
      expect(applyValidationRules(result, [{ type: "header_exists", header: "X-Request-Id" }])).toEqual([
        'Header "X-Request-Id" does not exist',
      ]);
    });

    it("fails when no header name is specified", () => {
      expect(applyValidationRules(createResult(), [{ type: "header_exists" }])).toEqual(["Header name not specified"]);
    });
  });

  describe("header_value", () => {
    const result = createResult({ headers: { "Content-Type": "Application/JSON" } });

    it("matches header names case-insensitively but values case-sensitively for 'equals'", () => {
      expect(
        applyValidationRules(result, [
          { type: "header_value", header: "content-type", operator: "equals", value: "Application/JSON" },
        ])
      ).toEqual([]);
      expect(
        applyValidationRules(result, [
          { type: "header_value", header: "content-type", operator: "equals", value: "application/json" },
        ])
      ).toEqual(['Header "content-type" value "Application/JSON" does not equal "application/json"']);
    });

    it("supports 'contains' on the header value, case-sensitively", () => {
      expect(
        applyValidationRules(result, [
          { type: "header_value", header: "Content-Type", operator: "contains", value: "JSON" },
        ])
      ).toEqual([]);
      expect(
        applyValidationRules(result, [
          { type: "header_value", header: "Content-Type", operator: "contains", value: "json" },
        ])
      ).toEqual(['Header "Content-Type" value "Application/JSON" does not contain "json"']);
    });

    it("fails when the header is missing or unnamed", () => {
      expect(
        applyValidationRules(result, [{ type: "header_value", header: "X-Missing", operator: "equals", value: "x" }])
      ).toEqual(['Header "X-Missing" does not exist']);
      expect(applyValidationRules(result, [{ type: "header_value", operator: "equals", value: "x" }])).toEqual([
        "Header name not specified",
      ]);
    });
  });

  describe("rule combination and error handling", () => {
    it("evaluates every rule and collects all failures in rule order", () => {
      const rules: ValidationRule[] = [
        { type: "status_code", operator: "equals", value: 200 },
        { type: "response_time", operator: "less_than", value: 100 },
        { type: "response_body_contains", value: "healthy" },
      ];
      const result = createResult({ statusCode: 503, responseTimeMs: 250 });

      // All rules run: a failure does not short-circuit the remaining rules.
      expect(applyValidationRules(result, rules, "service degraded")).toEqual([
        "Status code 503 does not equal 200",
        "Response time 250ms is not less than 100ms",
        'Response body does not contain "healthy"',
      ]);
    });

    it("only reports the rules that fail", () => {
      const rules: ValidationRule[] = [
        { type: "status_code", operator: "equals", value: 200 },
        { type: "response_body_contains", value: "down" },
      ];
      expect(applyValidationRules(createResult(), rules, "system is down")).toEqual([]);
    });

    it("reports unknown rule types as errors", () => {
      expect(applyValidationRules(createResult(), [{ type: "certificate" as ValidationRule["type"] }])).toEqual([
        "Unknown validation rule type: certificate",
      ]);
    });

    it("converts a thrown validator error into a validation error instead of aborting", () => {
      // headers is typed as Record<string, string>, but a malformed result at runtime
      // (headers undefined) makes Object.keys throw; the engine catches it and keeps
      // evaluating the remaining rules.
      const broken = createResult({ headers: undefined as unknown as Record<string, string>, statusCode: 500 });
      const errors = applyValidationRules(broken, [
        { type: "header_exists", header: "Content-Type" },
        { type: "status_code", operator: "equals", value: 200 },
      ]);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatch(/^Validation rule error: /);
      expect(errors[1]).toBe("Status code 500 does not equal 200");
    });
  });
});
