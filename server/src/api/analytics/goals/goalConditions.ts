import SqlString from "sqlstring";
import { patternToRegex } from "../utils/utils.js";

type GoalConfig = {
  pathPattern?: string;
  eventName?: string;
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
  propertyFilters?: Array<{
    key: string;
    value: string | number | boolean;
  }>;
};

type GoalConditionInput = {
  goalType: string;
  config: GoalConfig;
};

const getPropertyFilters = (config: GoalConfig) =>
  config.propertyFilters ||
  (config.eventPropertyKey && config.eventPropertyValue !== undefined
    ? [{ key: config.eventPropertyKey, value: config.eventPropertyValue }]
    : []);

export function buildGoalCondition(goal: GoalConditionInput) {
  if (goal.goalType === "path") {
    const pathPattern = goal.config.pathPattern;
    if (!pathPattern) return null;

    const regex = patternToRegex(pathPattern);
    let condition = `type = 'pageview' AND match(pathname, ${SqlString.escape(regex)})`;

    for (const filter of getPropertyFilters(goal.config)) {
      const propValueAccessor = `url_parameters[${SqlString.escape(filter.key)}]`;
      condition += ` AND ${propValueAccessor} = ${SqlString.escape(String(filter.value))}`;
    }

    return condition;
  }

  if (goal.goalType === "event") {
    const eventName = goal.config.eventName;
    if (!eventName) return null;

    let condition = `type = 'custom_event' AND event_name = ${SqlString.escape(eventName)}`;

    for (const filter of getPropertyFilters(goal.config)) {
      if (typeof filter.value === "string") {
        condition += ` AND JSONExtractString(toString(props), ${SqlString.escape(filter.key)}) = ${SqlString.escape(
          filter.value
        )}`;
      } else if (typeof filter.value === "number") {
        condition += ` AND toFloat64(JSONExtractString(toString(props), ${SqlString.escape(
          filter.key
        )})) = ${SqlString.escape(filter.value)}`;
      } else if (typeof filter.value === "boolean") {
        condition += ` AND JSONExtractString(toString(props), ${SqlString.escape(filter.key)}) = ${SqlString.escape(
          filter.value ? "true" : "false"
        )}`;
      }
    }

    return condition;
  }

  return null;
}
