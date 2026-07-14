import { db } from "../../db/postgres/postgres.js";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { importPlatforms, importStatus, organization } from "../../db/postgres/schema.js";
import { DateTime } from "luxon";

export type SelectImportStatus = typeof importStatus.$inferSelect;

const IMPORT_TIMEOUT_HOURS = 2;

/** Serialize import state changes across every worker using the organization row. */
export async function withOrganizationImportLock<T>(organizationId: string, work: () => Promise<T>): Promise<T> {
  return db.transaction(async tx => {
    const [lockedOrganization] = await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for("update");

    if (!lockedOrganization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    return work();
  });
}

export async function createImport(data: {
  siteId: number;
  organizationId: string;
  platform: (typeof importPlatforms)[number];
  enforceSingleActive?: boolean;
}): Promise<{ importId: string } | null> {
  const insertImport = async () => {
    const [result] = await db
      .insert(importStatus)
      .values({
        siteId: data.siteId,
        organizationId: data.organizationId,
        platform: data.platform,
      })
      .returning({ importId: importStatus.importId });

    return result;
  };

  if (!data.enforceSingleActive) return insertImport();

  return withOrganizationImportLock(data.organizationId, async () => {
    const now = DateTime.utc();
    const staleCutoff = now.minus({ hours: IMPORT_TIMEOUT_HOURS }).toSQL({ includeOffset: false });
    if (!staleCutoff) throw new Error("Failed to calculate import timeout");

    await db
      .update(importStatus)
      .set({ completedAt: now.toISO() })
      .where(
        and(
          eq(importStatus.organizationId, data.organizationId),
          isNull(importStatus.completedAt),
          lt(importStatus.startedAt, staleCutoff)
        )
      );

    const activeImport = await db.query.importStatus.findFirst({
      where: and(eq(importStatus.organizationId, data.organizationId), isNull(importStatus.completedAt)),
    });
    if (activeImport) return null;

    return insertImport();
  });
}

export async function updateImportProgress(
  importId: string,
  importedEvents: number,
  skippedEvents: number,
  invalidEvents: number
): Promise<void> {
  await db
    .update(importStatus)
    .set({
      importedEvents: sql`${importStatus.importedEvents} + ${importedEvents}`,
      skippedEvents: sql`${importStatus.skippedEvents} + ${skippedEvents}`,
      invalidEvents: sql`${importStatus.invalidEvents} + ${invalidEvents}`,
    })
    .where(eq(importStatus.importId, importId));
}

export async function completeImport(importId: string): Promise<void> {
  await db
    .update(importStatus)
    .set({
      completedAt: DateTime.utc().toISO(),
    })
    .where(eq(importStatus.importId, importId));
}

export async function getImportsForSite(siteId: number, limit = 10): Promise<SelectImportStatus[]> {
  return await db.query.importStatus.findMany({
    where: eq(importStatus.siteId, siteId),
    orderBy: [desc(importStatus.startedAt)],
    limit,
  });
}

export async function deleteImport(importId: string): Promise<void> {
  await db.delete(importStatus).where(eq(importStatus.importId, importId));
}

export async function getImportById(importId: string): Promise<SelectImportStatus | undefined> {
  return await db.query.importStatus.findFirst({
    where: eq(importStatus.importId, importId),
  });
}
