import { ResultSet } from "@clickhouse/client";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/postgres/postgres.js";
import { userProfiles } from "../../../db/postgres/schema.js";

/**
 * ClickHouse serialises 64-bit integers (and Decimals) as JSON strings, so
 * numeric-looking string columns are coerced back to numbers here.
 *
 * The coercion is lossless-only: a string becomes a number solely when
 * `String(Number(v))` reproduces the original text exactly. Anything a double
 * cannot represent — an 18-digit ad-platform campaign ID like
 * `120248430174340693`, an identifier with leading zeros — stays text instead of
 * being silently rounded to the nearest representable value. Counts and
 * percentages round-trip cleanly and are unaffected.
 */
function coerceNumericString(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const asNumber = Number(value);
  // Rejects NaN and Infinity, which would otherwise round-trip through String()
  // and turn values literally named "NaN" or "Infinity" into numbers.
  if (!Number.isFinite(asNumber)) return value;

  return String(asNumber) === value ? asNumber : value;
}

export async function processResults<T>(results: ResultSet<"JSONEachRow">): Promise<T[]> {
  const data: T[] = await results.json();
  for (const row of data) {
    for (const key in row) {
      // Identifiers are opaque text even when they look numeric.
      if (key === "session_id" || key === "user_id" || key === "identified_user_id" || key === "effective_user_id") {
        continue;
      }
      row[key] = coerceNumericString(row[key]) as any;
    }
  }
  return data;
}

/**
 * Converts wildcard path patterns to ClickHouse regex pattern
 * - Supports * for matching a single path segment (not including /)
 * - Supports ** for matching multiple path segments (including /)
 * @param pattern Path pattern with wildcards
 * @returns ClickHouse-compatible regex string
 */
export function patternToRegex(pattern: string): string {
  // Escape special regex characters except * which we'll handle specially
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

  // Replace ** with a temporary marker
  const withDoubleStar = escapedPattern.replace(/\*\*/g, "{{DOUBLE_STAR}}");

  // Replace * with [^/]+ (any characters except /)
  const withSingleStar = withDoubleStar.replace(/\*/g, "[^/]+");

  // Replace the double star marker with .* (any characters including /)
  const finalRegex = withSingleStar.replace(/{{DOUBLE_STAR}}/g, ".*");

  // Anchor the regex to start/end of string for exact matches
  return `^${finalRegex}$`;
}

/**
 * Enriches data with user traits from Postgres for identified users.
 * This is a shared utility to avoid duplicating the traits fetching logic.
 * Uses identified_user_id to look up traits since that's the custom user ID.
 */
export async function enrichWithTraits<T extends { identified_user_id: string }>(
  data: T[],
  siteId: number
): Promise<Array<T & { traits: Record<string, unknown> | null }>> {
  const identifiedUserIds = [
    ...new Set(data.filter(item => item.identified_user_id).map(item => item.identified_user_id)),
  ];

  let traitsMap: Map<string, Record<string, unknown>> = new Map();
  if (identifiedUserIds.length > 0) {
    const profiles = await db
      .select({
        userId: userProfiles.userId,
        traits: userProfiles.traits,
      })
      .from(userProfiles)
      .where(and(eq(userProfiles.siteId, siteId), inArray(userProfiles.userId, identifiedUserIds)));

    traitsMap = new Map(
      profiles.map(p => [
        p.userId,
        p.traits && typeof p.traits === "object" && !Array.isArray(p.traits)
          ? (p.traits as Record<string, unknown>)
          : {},
      ])
    );
  }

  return data.map(item => ({ ...item, traits: traitsMap.get(item.identified_user_id) || null }));
}
