import SqlString from "sqlstring";
import { patternToRegex } from "./utils.js";

export type PropertyFilter = {
  key: string;
  value: string | number | boolean;
};

// Autocaptured event types that goals and funnel steps can target directly
export const AUTOCAPTURE_TARGET_TYPES = ["outbound", "button_click", "form_submit", "copy"] as const;

export type AutocaptureTargetType = (typeof AUTOCAPTURE_TARGET_TYPES)[number];

export function isAutocaptureTargetType(type: string): type is AutocaptureTargetType {
  return (AUTOCAPTURE_TARGET_TYPES as readonly string[]).includes(type);
}

// Maps each autocapture type to the props keys its value pattern is matched against.
export const AUTOCAPTURE_PATTERN_PROPS: Record<AutocaptureTargetType, readonly string[]> = {
  outbound: ["url"],
  button_click: ["text"],
  form_submit: ["formName", "formId", "formAction"],
  copy: ["text"],
};

/**
 * Quotes a scalar as a SQL literal. SqlString.escape only does that for
 * scalars: handed an object it emits `key` = 'value' pairs and handed an array
 * a bare list, neither of which is a literal. Step and goal definitions come
 * from request bodies and jsonb columns, so a wrong type must fail here rather
 * than change the shape of the query.
 */
export function escapeLiteral(value: string | number | boolean): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new TypeError("SQL literal must be a string, number or boolean");
  }
  return SqlString.escape(value);
}

type LegacyPropertyConfig = {
  eventPropertyKey?: string;
  eventPropertyValue?: string | number | boolean;
  propertyFilters?: PropertyFilter[];
};

// Support both the propertyFilters array and the legacy single-property fields
export function resolvePropertyFilters(config: LegacyPropertyConfig): PropertyFilter[] {
  return (
    config.propertyFilters ||
    (config.eventPropertyKey && config.eventPropertyValue !== undefined
      ? [{ key: config.eventPropertyKey, value: config.eventPropertyValue }]
      : [])
  );
}

function propsFilterCondition(filter: PropertyFilter): string {
  const key = escapeLiteral(filter.key);
  if (typeof filter.value === "number") {
    return `toFloat64OrNull(JSONExtractString(toString(props), ${key})) = ${escapeLiteral(filter.value)}`;
  }
  const value = typeof filter.value === "boolean" ? (filter.value ? "true" : "false") : filter.value;
  return `JSONExtractString(toString(props), ${key}) = ${escapeLiteral(value)}`;
}

export function buildPageCondition(pathPattern: string, filters: PropertyFilter[]): string {
  const regex = patternToRegex(pathPattern);
  let condition = `type = 'pageview' AND match(pathname, ${escapeLiteral(regex)})`;

  // Page targets match property filters against URL parameters
  for (const filter of filters) {
    condition += ` AND url_parameters[${escapeLiteral(filter.key)}] = ${escapeLiteral(String(filter.value))}`;
  }

  return condition;
}

export function buildEventCondition(eventName: string, filters: PropertyFilter[]): string {
  let condition = `type = 'custom_event' AND event_name = ${escapeLiteral(eventName)}`;

  for (const filter of filters) {
    condition += ` AND ${propsFilterCondition(filter)}`;
  }

  return condition;
}

// Converts a free-text wildcard pattern into a regex for autocapture value
// matching. Unlike patternToRegex (used for path patterns, where a single '*'
// must not cross a '/' segment boundary), autocapture values (button text,
// copied text, form name/id) have no such boundary, so '*' may match '/' too.
function textPatternToRegex(pattern: string): string {
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const withDoubleStar = escapedPattern.replace(/\*\*/g, "{{DOUBLE_STAR}}");
  const withSingleStar = withDoubleStar.replace(/\*/g, ".+");
  const finalRegex = withSingleStar.replace(/{{DOUBLE_STAR}}/g, ".*");
  return `^${finalRegex}$`;
}

// Matches an autocaptured event type, optionally narrowed by a wildcard
// pattern against the type's primary props (e.g. the destination url for
// outbound clicks) and by exact-match property filters.
export function buildAutocaptureCondition(
  type: AutocaptureTargetType,
  pattern: string | undefined,
  filters: PropertyFilter[]
): string {
  let condition = `type = ${escapeLiteral(type)}`;

  const trimmedPattern = pattern?.trim();
  if (trimmedPattern) {
    const regex = escapeLiteral(textPatternToRegex(trimmedPattern));
    const patternMatches = AUTOCAPTURE_PATTERN_PROPS[type].map(
      prop => `match(JSONExtractString(toString(props), ${escapeLiteral(prop)}), ${regex})`
    );
    condition += ` AND (${patternMatches.join(" OR ")})`;
  }

  for (const filter of filters) {
    condition += ` AND ${propsFilterCondition(filter)}`;
  }

  return condition;
}
