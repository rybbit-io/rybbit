import { z } from "zod";
import {
  AutocaptureTargetType,
  buildAutocaptureCondition,
  buildEventCondition,
  buildPageCondition,
  escapeLiteral,
  isAutocaptureTargetType,
  PropertyFilter,
  resolvePropertyFilters,
} from "../utils/eventConditions.js";

export type FunnelStepType = "page" | "event" | AutocaptureTargetType;

export type FunnelStep = {
  value: string;
  name?: string;
  type: FunnelStepType;
  hostname?: string;
  // Deprecated fields - kept for backwards compatibility
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
  // New field for multiple property filters
  propertyFilters?: PropertyFilter[];
};

/** Longest funnel a request may ask to be analyzed; every step adds a CTE and a join. */
export const MAX_FUNNEL_STEPS = 50;

// Steps arrive in request bodies and out of a jsonb column, and every field
// ends up in SQL, so they are checked before they are turned into a query.
// Unknown step types are kept: the condition builder matches them as custom
// events.
const propertyValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const funnelStepSchema = z.object({
  value: z.string(),
  type: z.string(),
  name: z.string().optional(),
  hostname: z.string().optional(),
  eventPropertyKey: z.string().optional(),
  eventPropertyValue: propertyValueSchema.optional(),
  propertyFilters: z.array(z.object({ key: z.string(), value: propertyValueSchema })).optional(),
});
const funnelStepsSchema = z.array(funnelStepSchema).min(2);

/** Well-formed steps (at least two), or null. `max` bounds a request; saved funnels are read uncapped. */
export function parseFunnelSteps(steps: unknown, max = Infinity): FunnelStep[] | null {
  const parsed = funnelStepsSchema.safeParse(steps);
  if (!parsed.success || parsed.data.length > max) return null;
  return parsed.data as FunnelStep[];
}

export const INVALID_FUNNEL_STEPS_ERROR = `A funnel needs between 2 and ${MAX_FUNNEL_STEPS} well-formed steps`;

export function buildFunnelStepCondition(step: FunnelStep): string {
  const filters = resolvePropertyFilters(step);

  let condition: string;
  if (step.type === "page") {
    condition = buildPageCondition(step.value, filters);
  } else if (isAutocaptureTargetType(step.type)) {
    condition = buildAutocaptureCondition(step.type, step.value, filters);
  } else {
    // "event" and unknown legacy types match custom events
    condition = buildEventCondition(step.value, filters);
  }

  if (step.hostname) {
    condition += ` AND hostname = ${escapeLiteral(step.hostname)}`;
  }

  return condition;
}
