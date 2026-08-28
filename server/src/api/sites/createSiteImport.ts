import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { importPlatforms } from "../../db/postgres/schema.js";
import { SiteImportError, startSiteImport } from "../../services/import/siteImport.js";

const createSiteImportRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
    }),
    body: z.object({
      platform: z.enum(importPlatforms),
    }),
  })
  .strict();

type CreateSiteImportRequest = {
  Params: z.infer<typeof createSiteImportRequestSchema.shape.params>;
  Body: z.infer<typeof createSiteImportRequestSchema.shape.body>;
};

export async function createSiteImport(request: FastifyRequest<CreateSiteImportRequest>, reply: FastifyReply) {
  try {
    const parsed = createSiteImportRequestSchema.safeParse({
      params: request.params,
      body: request.body,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    const data = await startSiteImport({
      siteId: parsed.data.params.siteId,
      platform: parsed.data.body.platform,
    });

    return reply.send({ data });
  } catch (error) {
    if (error instanceof SiteImportError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error({ err: error }, "Error creating import");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
