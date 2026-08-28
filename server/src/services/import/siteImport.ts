import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { db } from "../../db/postgres/postgres.js";
import { importPlatforms, organization, sites } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { getBestSubscription } from "../../lib/subscriptionUtils.js";
import { importLease } from "./importLease.js";
import { importQuotaManager } from "./importQuotaManager.js";
import {
  createImport,
  deleteImport,
  getImportById,
  getImportsForSite,
  recordImportBatch,
  type SelectImportStatus,
} from "./importStatusManager.js";
import { PlausibleEvent, PlausibleImportMapper } from "./mappers/plausible.js";
import { type RybbitEvent } from "./mappers/rybbit.js";
import { SimpleAnalyticsEvent, SimpleAnalyticsImportMapper } from "./mappers/simpleAnalytics.js";
import { UmamiEvent, UmamiImportMapper } from "./mappers/umami.js";

const logger = createServiceLogger("site-import");
const PAID_PLAN_ERROR = "Data import is not available on the free plan. Please upgrade to a paid plan.";
const CONCURRENT_IMPORT_ERROR = "Only 1 concurrent import allowed per organization";

type ImportPlatform = (typeof importPlatforms)[number];

interface SiteImportContext {
  organizationId: string;
  stripeCustomerId: string | null;
}

export class SiteImportError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "SiteImportError";
  }
}

async function getSiteImportContext(siteId: number): Promise<SiteImportContext> {
  const [siteRecord] = await db
    .select({
      organizationId: sites.organizationId,
      stripeCustomerId: organization.stripeCustomerId,
    })
    .from(sites)
    .leftJoin(organization, eq(sites.organizationId, organization.id))
    .where(eq(sites.siteId, siteId))
    .limit(1);

  if (!siteRecord?.organizationId) {
    throw new SiteImportError(404, "Site not found");
  }

  return {
    organizationId: siteRecord.organizationId,
    stripeCustomerId: siteRecord.stripeCustomerId,
  };
}

async function assertImportEligible(context: SiteImportContext): Promise<void> {
  if (!IS_CLOUD) return;

  const subscription = await getBestSubscription(context.organizationId, context.stripeCustomerId);
  if (subscription.source === "free") {
    throw new SiteImportError(403, PAID_PLAN_ERROR);
  }
}

async function releaseImportLease(organizationId: string, importId: string): Promise<void> {
  try {
    await importLease.release(organizationId, importId);
  } catch (error) {
    logger.error({ err: error, organizationId, importId }, "Failed to release Site Import lease");
  }
}

function mapEvents(platform: ImportPlatform, events: unknown[], siteId: number, importId: string): RybbitEvent[] {
  switch (platform) {
    case "umami":
      return UmamiImportMapper.transform(events as UmamiEvent[], siteId, importId);
    case "simple_analytics":
      return SimpleAnalyticsImportMapper.transform(events as SimpleAnalyticsEvent[], siteId, importId);
    case "plausible":
      return PlausibleImportMapper.transform(events as PlausibleEvent[], siteId, importId);
  }
}

async function deleteImportedEvents(
  siteId: number,
  importId: string,
  { waitForCompletion = false }: { waitForCompletion?: boolean } = {}
): Promise<void> {
  await clickhouse.command({
    query: "DELETE FROM events WHERE import_id = {importId:UUID} AND site_id = {siteId:UInt16}",
    query_params: { importId, siteId },
    ...(waitForCompletion ? { clickhouse_settings: { mutations_sync: "1" } } : {}),
  });
}

async function abortImportAfterProgressFailure(record: SelectImportStatus, progressError: unknown): Promise<never> {
  try {
    // The tracker re-read after this path must not see the rows whose progress
    // failed to persist, so compensation is the one deletion that waits.
    await deleteImportedEvents(record.siteId, record.importId, { waitForCompletion: true });
    await deleteImport(record.importId);
  } catch (cleanupError) {
    logger.error(
      { err: cleanupError, progressError, importId: record.importId },
      "Site Import progress failed and automatic cleanup also failed"
    );
    throw new SiteImportError(
      500,
      "Import progress could not be recorded and automatic cleanup failed. Please try again later.",
      progressError
    );
  }

  importQuotaManager.invalidateTracker(record.organizationId);
  await releaseImportLease(record.organizationId, record.importId);

  throw new SiteImportError(
    500,
    "Import was aborted after its progress could not be recorded. Start a new import to try again.",
    progressError
  );
}

export async function startSiteImport(input: { siteId: number; platform: ImportPlatform }): Promise<{
  importId: string;
  allowedDateRange: { earliestAllowedDate: string; latestAllowedDate: string };
}> {
  const context = await getSiteImportContext(input.siteId);
  await assertImportEligible(context);

  const importId = randomUUID();
  const acquired = await importLease.acquire(context.organizationId, importId);
  if (!acquired) {
    throw new SiteImportError(429, CONCURRENT_IMPORT_ERROR);
  }

  try {
    const quotaTracker = await importQuotaManager.getTracker(context.organizationId);
    const earliestAllowedDate = DateTime.fromFormat(quotaTracker.getOldestAllowedMonth() + "01", "yyyyMMdd", {
      zone: "utc",
    }).toFormat("yyyy-MM-dd");
    const latestAllowedDate = DateTime.utc().toFormat("yyyy-MM-dd");

    await createImport({
      importId,
      siteId: input.siteId,
      organizationId: context.organizationId,
      platform: input.platform,
    });

    return {
      importId,
      allowedDateRange: { earliestAllowedDate, latestAllowedDate },
    };
  } catch (error) {
    await releaseImportLease(context.organizationId, importId);
    throw error;
  }
}

export async function importSiteEvents(input: {
  siteId: number;
  importId: string;
  events: unknown[];
  isLastBatch: boolean;
}): Promise<void> {
  const record = await getImportById(input.importId);
  if (!record) throw new SiteImportError(404, "Import not found");
  if (record.siteId !== input.siteId) throw new SiteImportError(400, "Import does not belong to this site");
  if (record.completedAt !== null) {
    // A successful final-batch response can be lost. Treat its retry as the
    // same success without re-inserting the batch.
    if (input.isLastBatch) return;
    throw new SiteImportError(400, "Import is already complete");
  }

  const context = await getSiteImportContext(input.siteId);
  if (context.organizationId !== record.organizationId) {
    throw new SiteImportError(400, "Import does not belong to this Site's Organization");
  }
  await assertImportEligible(context);

  const leaseIsCurrent = await importLease.refresh(record.organizationId, record.importId);
  if (!leaseIsCurrent) {
    throw new SiteImportError(409, "Import lease expired. Start a new import to continue.");
  }

  const quotaTracker = await importQuotaManager.getTracker(record.organizationId);
  const transformedEvents = mapEvents(record.platform, input.events, input.siteId, input.importId);
  const invalidEventCount = input.events.length - transformedEvents.length;
  const reservation = quotaTracker.reserveBatch(transformedEvents.map(event => event.timestamp));
  const eventsWithinQuota = reservation.allowedIndices.map(index => transformedEvents[index]);
  const skippedDueToQuota = transformedEvents.length - eventsWithinQuota.length;

  if (eventsWithinQuota.length > 0) {
    try {
      await clickhouse.insert({
        table: "events",
        values: eventsWithinQuota,
        format: "JSONEachRow",
      });
    } catch (error) {
      reservation.rollback();
      throw error;
    }
  }

  try {
    await recordImportBatch(
      input.importId,
      eventsWithinQuota.length,
      skippedDueToQuota,
      invalidEventCount,
      input.isLastBatch
    );
  } catch (error) {
    reservation.rollback();
    if (eventsWithinQuota.length > 0) {
      return abortImportAfterProgressFailure(record, error);
    }
    throw error;
  }

  if (input.isLastBatch) {
    await releaseImportLease(record.organizationId, record.importId);
  }
}

export async function listSiteImports(siteId: number): Promise<
  Array<{
    importId: string;
    platform: ImportPlatform;
    importedEvents: number;
    skippedEvents: number;
    invalidEvents: number;
    startedAt: string;
    completedAt: string | null;
  }>
> {
  const context = await getSiteImportContext(siteId);
  await assertImportEligible(context);

  const imports = await getImportsForSite(siteId);
  return imports.map(
    ({ importId, platform, importedEvents, skippedEvents, invalidEvents, startedAt, completedAt }) => ({
      importId,
      platform,
      importedEvents,
      skippedEvents,
      invalidEvents,
      startedAt,
      completedAt,
    })
  );
}

export async function removeSiteImport(input: { siteId: number; importId: string }): Promise<void> {
  const record = await getImportById(input.importId);
  if (!record) throw new SiteImportError(404, "Import not found");
  if (record.siteId !== input.siteId) throw new SiteImportError(403, "Import does not belong to this site");
  if (record.completedAt === null) throw new SiteImportError(400, "Cannot delete active import");

  const context = await getSiteImportContext(input.siteId);
  await assertImportEligible(context);

  await deleteImportedEvents(input.siteId, input.importId);
  await deleteImport(input.importId);
  importQuotaManager.invalidateTracker(record.organizationId);
  await releaseImportLease(record.organizationId, record.importId);
}
