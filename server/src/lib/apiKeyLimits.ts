import { and, count, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/postgres/postgres.js";
import { apiKey } from "../db/postgres/schema.js";

type DbLike = Pick<typeof db, "select">;
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
export async function countApiKeysForReference(referenceId: string, executor: DbLike = db): Promise<number> {
  const [row] = await executor
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

/**
 * Runs `create` only if the owner still has a free key slot. Check-and-create
 * is serialized per owner with a Postgres transaction advisory lock, so
 * concurrent requests — across server instances — cannot overshoot the limit:
 * the next holder counts only after `create` has committed (better-auth
 * commits on its own connection before this transaction releases the lock).
 */
export async function createApiKeyWithinLimit<T>(
  referenceId: string,
  limit: number,
  create: () => Promise<T>
): Promise<{ allowed: true; result: T } | { allowed: false }> {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${referenceId}, 0))`);
    if ((await countApiKeysForReference(referenceId, tx)) >= limit) {
      return { allowed: false as const };
    }
    return { allowed: true as const, result: await create() };
  });
}
