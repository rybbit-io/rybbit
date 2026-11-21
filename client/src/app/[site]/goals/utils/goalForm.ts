import * as z from "zod";
import { Goal, GoalConfig, GoalDefinition, GoalType } from "@/api/analytics/endpoints";
import { AUTOCAPTURE_TARGET_TYPES, resolvePropertyFilters } from "@/lib/events";
import { goalPattern } from "./goalLedger";

export const GOAL_TYPES: readonly GoalType[] = ["path", "event", ...AUTOCAPTURE_TARGET_TYPES];

// A path goal is matched against the pathname only; a pasted URL never matches.
const LOOKS_LIKE_URL = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/)/i;

export const goalFormSchema = z
  .object({
    name: z.string().optional(),
    goalType: z.enum(["path", "event", ...AUTOCAPTURE_TARGET_TYPES]),
    // One field for what the goal matches; which config key it is saved under
    // depends on the type. Autocapture goals match any event of their type
    // when it is empty.
    pattern: z.string(),
  })
  .superRefine((data, context) => {
    const pattern = data.pattern.trim();

    if ((data.goalType === "path" || data.goalType === "event") && !pattern) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["pattern"], message: "required" });
    }
    if (data.goalType === "path" && LOOKS_LIKE_URL.test(pattern)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["pattern"], message: "url" });
    }
    if (data.goalType !== "path" && data.goalType !== "event" && pattern.length > 512) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["pattern"], message: "too_long" });
    }
  });

export type GoalFormValues = z.infer<typeof goalFormSchema>;

/** A property filter as typed: both sides are text until the goal is saved. */
export interface PropertyFilterDraft {
  key: string;
  value: string;
}

export type GoalFormMode = "create" | "edit" | "clone";

/**
 * The form's starting values: empty for a new goal, the goal's own for edit and
 * clone. A clone starts under `cloneName` ("Signup (Copy)").
 */
export function goalFormDefaults(goal: Goal | undefined, mode: GoalFormMode, cloneName = ""): GoalFormValues {
  if (!goal || mode === "create") return { name: "", goalType: "path", pattern: "" };

  return {
    name: mode === "clone" ? cloneName : (goal.name ?? ""),
    goalType: goal.goalType,
    pattern: goalPattern(goal),
  };
}

/** The goal's property filters as form rows, reading the legacy single-property fields too. */
export function propertyDraftsOf(goal: Goal | undefined): PropertyFilterDraft[] {
  if (!goal) return [];
  return resolvePropertyFilters(goal.config).map(filter => ({ key: filter.key, value: String(filter.value) }));
}

/**
 * The definition the form describes, or null while it is incomplete or
 * invalid. This is exactly what is saved, and what the live preview counts.
 * Only complete property rows are kept; the legacy single-property fields are
 * never written.
 */
export function goalDefinitionOf(values: GoalFormValues, properties: PropertyFilterDraft[]): GoalDefinition | null {
  if (!goalFormSchema.safeParse(values).success) return null;

  const pattern = values.pattern.trim();
  const propertyFilters = properties
    .map(filter => ({ key: filter.key.trim(), value: filter.value }))
    .filter(filter => filter.key && filter.value);

  const config: GoalConfig =
    values.goalType === "path"
      ? { pathPattern: pattern }
      : values.goalType === "event"
        ? { eventName: pattern }
        : pattern
          ? { valuePattern: pattern }
          : {};

  if (propertyFilters.length > 0) config.propertyFilters = propertyFilters;

  return { goalType: values.goalType, config };
}
