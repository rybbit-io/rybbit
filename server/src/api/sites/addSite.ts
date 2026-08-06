import { FastifyReply, FastifyRequest } from "fastify";
import {
  type CreateSiteInput,
  SiteLifecycleError,
  siteConfigurationLifecycle,
} from "../../services/sites/siteConfigurationLifecycle.js";

type AddSiteRequestBody = Omit<CreateSiteInput, "organizationId" | "createdBy">;

export async function addSite(
  request: FastifyRequest<{
    Params: { organizationId: string };
    Body: AddSiteRequestBody;
  }>,
  reply: FastifyReply
) {
  try {
    const newSite = await siteConfigurationLifecycle.create({
      ...request.body,
      organizationId: request.params.organizationId,
      createdBy: request.user?.id,
    });

    return reply.status(201).send(newSite);
  } catch (error) {
    if (error instanceof SiteLifecycleError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        ...(error.details !== undefined && { details: error.details }),
      });
    }

    request.log.error({ err: error }, "Error adding site");
    return reply.status(500).send({
      error: "Internal server error",
    });
  }
}
