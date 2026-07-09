import {
  buildAutocaptureCondition,
  buildEventCondition,
  buildPageCondition,
  isAutocaptureTargetType,
  PropertyFilter,
  resolvePropertyFilters,
} from "../utils/eventConditions.js";

type GoalConfig = {
  pathPattern?: string;
  eventName?: string;
  valuePattern?: string;
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
  propertyFilters?: PropertyFilter[];
};

type GoalConditionInput = {
  goalType: string;
  config: GoalConfig;
};

export function buildGoalCondition(goal: GoalConditionInput) {
  const filters = resolvePropertyFilters(goal.config);

  if (goal.goalType === "path") {
    if (!goal.config.pathPattern) return null;
    return buildPageCondition(goal.config.pathPattern, filters);
  }

  if (goal.goalType === "event") {
    if (!goal.config.eventName) return null;
    return buildEventCondition(goal.config.eventName, filters);
  }

  if (isAutocaptureTargetType(goal.goalType)) {
    return buildAutocaptureCondition(goal.goalType, goal.config.valuePattern, filters);
  }

  return null;
}
