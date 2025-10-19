import { SQL, and, gte, lte } from "drizzle-orm";

/**
 * Combines multiple SQL conditions with AND
 * Replaces duplicate implementations in userService, statsService, eventStatsService
 */
export function combineConditions(
  conditions: SQL<unknown>[]
): SQL<unknown> | undefined {
  if (conditions.length === 0) return undefined;

  return conditions.reduce<SQL<unknown> | undefined>((acc, condition) =>
    acc ? and(acc, condition) : condition
  , undefined);
}

/**
 * Builds date range filters for a given field
 * Centralized utility to replace scattered date filtering logic
 */
export function buildDateRangeFilters(
  field: any,
  from?: string,
  to?: string
): SQL<unknown>[] {
  const filters: SQL<unknown>[] = [];

  if (from) {
    filters.push(gte(field, from));
  }

  if (to) {
    filters.push(lte(field, to));
  }

  return filters;
}

/**
 * Builds complete filters with project ID and optional date range
 * Common pattern across all services
 */
export function buildProjectFilters(
  projectIdField: any,
  projectId: string,
  dateField?: any,
  from?: string,
  to?: string
): SQL<unknown> | undefined {
  const conditions: SQL<unknown>[] = [];

  // Always filter by project ID
  conditions.push(projectIdField.eq ? projectIdField.eq(projectId) : projectIdField);

  // Add date range if provided
  if (dateField && (from || to)) {
    conditions.push(...buildDateRangeFilters(dateField, from, to));
  }

  return combineConditions(conditions);
}
