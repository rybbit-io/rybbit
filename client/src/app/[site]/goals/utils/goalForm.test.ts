import { describe, expect, it } from "vitest";
import { Goal } from "@/api/analytics/endpoints";
import { goalDefinitionOf, goalFormDefaults, goalFormSchema, propertyDraftsOf } from "./goalForm";

const goal = (overrides: Partial<Goal>): Goal => ({
  goalId: 1,
  name: "Signup",
  goalType: "event",
  config: { eventName: "signup" },
  createdAt: "2026-09-01 00:00:00",
  total_conversions: 0,
  total_sessions: 0,
  conversion_rate: 0,
  ...overrides,
});

describe("goalFormSchema", () => {
  const messageFor = (values: unknown) => {
    const result = goalFormSchema.safeParse(values);
    return result.success ? null : result.error.issues[0].message;
  };

  it("needs a pattern for page and event goals", () => {
    expect(messageFor({ goalType: "path", pattern: "  " })).toBe("required");
    expect(messageFor({ goalType: "event", pattern: "" })).toBe("required");
  });

  it("lets autocapture goals match any event of their type", () => {
    for (const goalType of ["outbound", "button_click", "form_submit", "copy"]) {
      expect(messageFor({ goalType, pattern: "" })).toBeNull();
    }
  });

  it("refuses a full URL as a page pattern, but not as an outbound pattern", () => {
    expect(messageFor({ goalType: "path", pattern: "https://rybbit.com/pricing" })).toBe("url");
    expect(messageFor({ goalType: "path", pattern: "rybbit.com/pricing" })).toBe("url");
    expect(messageFor({ goalType: "path", pattern: "/pricing" })).toBeNull();
    expect(messageFor({ goalType: "outbound", pattern: "https://github.com/**" })).toBeNull();
  });

  it("holds an autocapture pattern to the length the server accepts", () => {
    expect(messageFor({ goalType: "copy", pattern: "a".repeat(513) })).toBe("too_long");
    expect(messageFor({ goalType: "copy", pattern: "a".repeat(512) })).toBeNull();
  });
});

describe("goalDefinitionOf", () => {
  it("is null while the form is incomplete", () => {
    expect(goalDefinitionOf({ goalType: "path", pattern: "", name: "" }, [])).toBeNull();
    expect(goalDefinitionOf({ goalType: "path", pattern: "https://rybbit.com/x", name: "" }, [])).toBeNull();
  });

  it("saves the pattern under the config key of its type", () => {
    expect(goalDefinitionOf({ goalType: "path", pattern: " /welcome ", name: "" }, [])).toEqual({
      goalType: "path",
      config: { pathPattern: "/welcome" },
    });
    expect(goalDefinitionOf({ goalType: "event", pattern: "signup", name: "" }, [])).toEqual({
      goalType: "event",
      config: { eventName: "signup" },
    });
    expect(goalDefinitionOf({ goalType: "button_click", pattern: "Sign Up*", name: "" }, [])).toEqual({
      goalType: "button_click",
      config: { valuePattern: "Sign Up*" },
    });
  });

  it("saves an autocapture goal with no pattern as matching any event of the type", () => {
    for (const goalType of ["outbound", "button_click", "form_submit", "copy"] as const) {
      expect(goalDefinitionOf({ goalType, pattern: "  ", name: "" }, [])).toEqual({ goalType, config: {} });
    }
  });

  it("keeps only complete property rows", () => {
    const definition = goalDefinitionOf({ goalType: "event", pattern: "subscribed", name: "" }, [
      { key: " plan ", value: "pro" },
      { key: "", value: "orphan" },
      { key: "seats", value: "" },
    ]);

    expect(definition?.config).toEqual({ eventName: "subscribed", propertyFilters: [{ key: "plan", value: "pro" }] });
  });

  it("never writes the legacy single-property fields", () => {
    const definition = goalDefinitionOf({ goalType: "path", pattern: "/pricing", name: "" }, [
      { key: "utm_source", value: "ads" },
    ]);

    expect(definition?.config).not.toHaveProperty("eventPropertyKey");
    expect(definition?.config).not.toHaveProperty("eventPropertyValue");
  });
});

describe("goalFormDefaults", () => {
  it("starts a new goal empty, as a page goal", () => {
    expect(goalFormDefaults(undefined, "create")).toEqual({ name: "", goalType: "path", pattern: "" });
  });

  it("starts an edit from the goal", () => {
    expect(goalFormDefaults(goal({}), "edit")).toEqual({ name: "Signup", goalType: "event", pattern: "signup" });
    expect(
      goalFormDefaults(goal({ name: null, goalType: "form_submit", config: { valuePattern: "signup-form" } }), "edit")
    ).toEqual({ name: "", goalType: "form_submit", pattern: "signup-form" });
  });

  it("starts a clone under the copy's name", () => {
    expect(goalFormDefaults(goal({}), "clone", "Signup (Copy)")).toEqual({
      name: "Signup (Copy)",
      goalType: "event",
      pattern: "signup",
    });
  });
});

describe("propertyDraftsOf", () => {
  it("has no rows for a goal without property filters", () => {
    expect(propertyDraftsOf(undefined)).toEqual([]);
    expect(propertyDraftsOf(goal({}))).toEqual([]);
  });

  it("reads property filters as text", () => {
    const withFilters = goal({
      config: {
        eventName: "subscribed",
        propertyFilters: [
          { key: "plan", value: "pro" },
          { key: "seats", value: 5 },
          { key: "annual", value: true },
        ],
      },
    });

    expect(propertyDraftsOf(withFilters)).toEqual([
      { key: "plan", value: "pro" },
      { key: "seats", value: "5" },
      { key: "annual", value: "true" },
    ]);
  });

  it("reads the legacy single-property fields", () => {
    const legacy = goal({ config: { eventName: "subscribed", eventPropertyKey: "plan", eventPropertyValue: "pro" } });

    expect(propertyDraftsOf(legacy)).toEqual([{ key: "plan", value: "pro" }]);
  });
});
