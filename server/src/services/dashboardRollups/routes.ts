import { createHash } from "node:crypto";
import SqlString from "sqlstring";
import { z } from "zod";

const patternsSchema = z
  .array(
    z.object({
      siteId: z.number().int().positive().max(65535).optional(),
      path: z.string().min(1).max(512).startsWith("/"),
    })
  )
  .max(50);

export function getRoutePatterns() {
  const patterns = patternsSchema.parse(JSON.parse(process.env.DASHBOARD_ROUTE_PATTERNS || "[]"));
  return patterns.map(pattern => {
    const segments = pattern.path.replace(/\/$/, "").split("/");
    const regex = segments
      .map(segment => {
        if (/^:[A-Za-z][A-Za-z0-9_]*$/.test(segment)) return "[^/]+";
        if (segment.includes(":")) throw new Error("Route parameters must occupy an entire segment, e.g. /players/:id");
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    return { ...pattern, regex: `^${regex}/?$` };
  });
}
export type RoutePattern = ReturnType<typeof getRoutePatterns>[number];

export const routePatternsForSite = (patterns: RoutePattern[], siteId: number) =>
  patterns.filter(pattern => pattern.siteId === undefined || pattern.siteId === siteId);

export function routeGroupsEnabled() {
  try {
    return process.env.DASHBOARD_ROUTE_GROUPS === "true" && getRoutePatterns().length > 0;
  } catch {
    return false;
  }
}

export function routeExpression(patterns: RoutePattern[]): string {
  if (!patterns.length) return "pathname";
  // The query optimizer rewrites a one-branch multiIf to if. Use that exact
  // expression in the projection too, or ClickHouse silently skips it.
  return `${patterns.length === 1 ? "if" : "multiIf"}(${patterns
    .flatMap(pattern => [`match(pathname, ${SqlString.escape(pattern.regex)})`, SqlString.escape(pattern.path)])
    .join(", ")}, pathname)`;
}

export const routeBucket = {
  hour: "event_hour",
  day: "toStartOfDay(event_hour, 'UTC')",
  month: "toDateTime(toStartOfMonth(toTimeZone(event_hour, 'UTC')), 'UTC')",
} as const;

export function routeProjectionDDL(patterns: RoutePattern[], materialize = false): string[] {
  if (!patterns.length) return [];
  // A projection per distinct route ruleset. Keeping site_id out of the route
  // expression is essential: ClickHouse simplifies it under WHERE site_id=…,
  // after which the query no longer matches the stored projection expression.
  const expressions = [
    ...new Set([
      routeExpression(patterns.filter(pattern => pattern.siteId === undefined)),
      ...patterns
        .filter(pattern => pattern.siteId !== undefined)
        .map(pattern => routeExpression(routePatternsForSite(patterns, pattern.siteId!))),
    ]),
  ].filter(expression => expression !== "pathname");
  if (expressions.length > 8) throw new Error("At most 8 distinct route rulesets can be projected");
  const statements = [
    "ALTER TABLE pathname_hourly_mv_target MODIFY SETTING deduplicate_merge_projection_mode = 'rebuild'",
  ];
  for (const expression of expressions) {
    const version = createHash("sha256")
      .update(JSON.stringify([2, expression]))
      .digest("hex")
      .slice(0, 12);
    for (const resolution of ["hour", "day", "month"] as const) {
      const name = `route_groups_${resolution}_${version}`;
      statements.push(`ALTER TABLE pathname_hourly_mv_target ADD PROJECTION IF NOT EXISTS ${name} (
      SELECT site_id, ${routeBucket[resolution]} AS route_bucket, ${expression} AS route_group,
        sum(pageviews), any(hostname), uniqMergeState(sessions)
      GROUP BY site_id, route_bucket, route_group
    )`);
      if (materialize) statements.push(`ALTER TABLE pathname_hourly_mv_target MATERIALIZE PROJECTION ${name}`);
    }
  }
  return statements;
}
