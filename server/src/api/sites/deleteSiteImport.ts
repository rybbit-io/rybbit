import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { removeSiteImport, SiteImportError } from "../../services/import/siteImport.js";

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

export async function deleteSiteImport(request: FastifyRequest<DeleteImportRequest>, reply: FastifyReply) {
  try {
    const parsed = deleteImportRequestSchema.safeParse({
      params: request.params,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    await removeSiteImport(parsed.data.params);

    return reply.send();
  } catch (error) {
    if (error instanceof SiteImportError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error({ err: error }, "Error deleting import");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
