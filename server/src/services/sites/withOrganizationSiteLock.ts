import { sql } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";

export type SiteTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// All paths that add a site to an organization must hold the same lock while
// checking capacity and writing, including normal creation, claims, and moves.
export function withOrganizationSiteLock<T>(organizationId: string, operation: (tx: SiteTransaction) => Promise<T>) {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM organization WHERE id = ${organizationId} FOR UPDATE`);
    return operation(tx);
  });
}
