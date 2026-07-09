import SqlString from "sqlstring";
import {
  AutocaptureTargetType,
  buildAutocaptureCondition,
  buildEventCondition,
  buildPageCondition,
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
    condition += ` AND hostname = ${SqlString.escape(step.hostname)}`;
  }

  return condition;
}
