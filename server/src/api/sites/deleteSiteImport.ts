import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { z } from "zod";
import { getImportById, deleteImport } from "../../services/import/importStatusManager.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { IMPORT_TIMEOUT_MS, importQuotaManager } from "../../services/import/importQuotaManager.js";
import { db } from "../../db/postgres/postgres.js";
import { organization, sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getBestSubscription } from "../../lib/subscriptionUtils.js";
import { IS_CLOUD } from "../../lib/const.js";

const deleteImportRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
      importId: z.string().uuid(),
    }),
  })
  .strict();

type DeleteImportRequest = {
  Params: z.infer<typeof deleteImportRequestSchema.shape.params>;
};

// startedAt is Postgres text ("2026-10-24 09:15:00.123") written in UTC.
function isAbandoned(startedAt: string): boolean {
  const sql = DateTime.fromSQL(startedAt, { zone: "utc" });
  const started = sql.isValid ? sql : DateTime.fromISO(startedAt, { zone: "utc" });
  return started.isValid && DateTime.utc().diff(started).toMillis() > IMPORT_TIMEOUT_MS;
}

export async function deleteSiteImport(request: FastifyRequest<DeleteImportRequest>, reply: FastifyReply) {
  try {
    const parsed = deleteImportRequestSchema.safeParse({
      params: request.params,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    const { siteId, importId } = parsed.data.params;

    const importRecord = await getImportById(importId);
    if (!importRecord) {
      return reply.status(404).send({ error: "Import not found" });
    }

    if (importRecord.siteId !== siteId) {
      return reply.status(403).send({ error: "Import does not belong to this site" });
    }

    // Only the client's final batch completes an import, so one whose client stopped early would
    // otherwise be undeletable. Judged from startedAt in Postgres rather than the import lock,
    // which can be missing (Redis restarted, or the in-process fallback on another worker).
    if (importRecord.completedAt === null && !isAbandoned(importRecord.startedAt)) {
      return reply.status(400).send({ error: "Cannot delete active import" });
    }

    if (IS_CLOUD) {
      const [siteRecord] = await db
        .select({
          organizationId: sites.organizationId,
          stripeCustomerId: organization.stripeCustomerId,
        })
        .from(sites)
        .leftJoin(organization, eq(sites.organizationId, organization.id))
        .where(eq(sites.siteId, siteId))
        .limit(1);

      if (siteRecord.organizationId) {
        const subscription = await getBestSubscription(siteRecord.organizationId, siteRecord.stripeCustomerId);

        if (subscription.source === "free") {
          return reply.status(403).send({
            error: "Data import is not available on the free plan. Please upgrade to a paid plan.",
          });
        }
      }
    }

    try {
      await clickhouse.command({
        query: "DELETE FROM events WHERE import_id = {importId:UUID} AND site_id = {siteId:UInt16}",
        query_params: {
          importId: importId,
          siteId: siteId,
        },
      });
    } catch (chError) {
      return reply.status(500).send({ error: "Failed to delete imported events" });
    }

    try {
      await deleteImport(importId);
    } catch (dbError) {
      return reply.status(500).send({ error: "Failed to delete import record" });
    }

    // Releases the lock only if this import still holds it (an abandoned one whose lock
    // hasn't expired yet), never the lock of another import that is running now.
    await importQuotaManager.completeImport(importRecord.organizationId, importId);

    return reply.send();
  } catch (error) {
    request.log.error({ err: error }, "Error deleting import");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
