import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listSiteImports, SiteImportError } from "../../services/import/siteImport.js";

const getSiteImportsRequestSchema = z
  .object({
    params: z.object({
      siteId: z.coerce.number().int().positive(),
    }),
  })
  .strict();

type GetSiteImportsRequest = {
  Params: z.infer<typeof getSiteImportsRequestSchema.shape.params>;
};

export async function getSiteImports(request: FastifyRequest<GetSiteImportsRequest>, reply: FastifyReply) {
  try {
    const parsed = getSiteImportsRequestSchema.safeParse({
      params: request.params,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation error" });
    }

    return reply.send({ data: await listSiteImports(parsed.data.params.siteId) });
  } catch (error) {
    if (error instanceof SiteImportError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    request.log.error({ err: error }, "Error fetching imports");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
