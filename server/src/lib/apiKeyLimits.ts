import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { apiKey } from "../db/postgres/schema.js";
import {
  IS_CLOUD,
  PRO_API_KEY_LIMIT,
  SELF_HOSTED_API_KEY_LIMIT,
  STANDARD_API_KEY_LIMIT,
} from "./const.js";

/**
 * Maximum number of API keys an owner (a user or an organization) may hold.
 * Cloud limits follow the billing org's plan; self-hosted gets a flat cap.
 */
export function apiKeyLimitForPlan(planName: string | null | undefined): number {
  if (!IS_CLOUD) {
    return SELF_HOSTED_API_KEY_LIMIT;
  }
  const plan = planName || "free";
  return plan.includes("pro") || plan === "custom" ? PRO_API_KEY_LIMIT : STANDARD_API_KEY_LIMIT;
}

/**
 * Number of usable keys currently held by a user or organization: expired
 * keys (which linger until better-auth's lazy purge) and disabled keys don't
 * block the cap. User and org ids live in disjoint id spaces, so counting by
 * referenceId alone is exact.
 */
export async function countApiKeysForReference(referenceId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(apiKey)
    .where(
      and(
        eq(apiKey.referenceId, referenceId),
        eq(apiKey.enabled, true),
        or(isNull(apiKey.expiresAt), gt(apiKey.expiresAt, new Date().toISOString()))
      )
    );
  return row?.value ?? 0;
}
