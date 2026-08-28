import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { UmamiImportMapper } from "../../services/import/mappers/umami.js";
import { SimpleAnalyticsImportMapper } from "../../services/import/mappers/simpleAnalytics.js";
import { PlausibleImportMapper } from "../../services/import/mappers/plausible.js";
import { importSiteEvents, SiteImportError } from "../../services/import/siteImport.js";

const batchImportRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
      importId: z.string().uuid(),
    }),
    body: z.object({
      events: z.union([
        z.array(UmamiImportMapper.umamiEventKeyOnlySchema),
        z.array(SimpleAnalyticsImportMapper.simpleAnalyticsEventKeyOnlySchema),
        z.array(PlausibleImportMapper.plausibleEventKeyOnlySchema),
      ]),
      isLastBatch: z.boolean().optional(),
    }),
  })
  .strict();

type BatchImportRequest = {
  Params: z.infer<typeof batchImportRequestSchema.shape.params>;
  Body: z.infer<typeof batchImportRequestSchema.shape.body>;
};

export async function batchImportEvents(request: FastifyRequest<BatchImportRequest>, reply: FastifyReply) {
  try {
    const parsed = batchImportRequestSchema.safeParse({
      params: request.params,
      body: request.body,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    await importSiteEvents({
      siteId: parsed.data.params.siteId,
      importId: parsed.data.params.importId,
      events: parsed.data.body.events,
      isLastBatch: parsed.data.body.isLastBatch ?? false,
    });

    return reply.send();
  } catch (error) {
    if (error instanceof SiteImportError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error({ err: error }, "Error importing events");
    const message = error instanceof Error ? error.message : "Unknown error";
    return reply.status(500).send({ error: `Failed to insert events: ${message}` });
  }
}
