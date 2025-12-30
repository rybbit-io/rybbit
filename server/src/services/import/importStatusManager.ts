import { db } from "../../db/postgres/postgres.js";
import { eq, desc, sql } from "drizzle-orm";
import { importPlatforms, importStatus } from "../../db/postgres/schema.js";
import { DateTime } from "luxon";

export type SelectImportStatus = typeof importStatus.$inferSelect;

export async function createImport(data: {
  siteId: number;
  organizationId: string;
  platform: (typeof importPlatforms)[number];
}): Promise<{ importId: string }> {
  const [result] = await db
    .insert(importStatus)
    .values({
      siteId: data.siteId,
      organizationId: data.organizationId,
      platform: data.platform,
    })
    .returning({ importId: importStatus.importId });

  return result;
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
