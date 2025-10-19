import { FastifyReply, FastifyRequest } from "fastify";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { checkApiKeyRateLimit } from "../../services/shared/requestValidation.js";
import { getOrCreateProjectForSite } from "../../services/projects/projectService.js";

const logger = createServiceLogger("api-v1");

export async function authenticateSite(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    logger.warn({ path: request.url }, "Missing API key");
    return reply.status(401).send({ error: "Missing API key" });
  }

  // Validate that the API key starts with rb_ prefix
  if (!apiKey.startsWith("rb_")) {
    logger.warn({ path: request.url }, "Invalid API key format");
    return reply.status(401).send({ error: "Invalid API key format" });
  }

  // Find the site by API key
  const site = await siteConfig.getConfigByApiKey(apiKey);
  if (!site) {
    logger.warn({ path: request.url }, "Invalid API key");
    return reply.status(401).send({ error: "Invalid API key" });
  }

  // Check rate limit
  if (!checkApiKeyRateLimit(apiKey)) {
    logger.warn({ siteId: site.siteId, path: request.url }, "Rate limit exceeded");
    return reply.status(429).send({
      error: "Rate limit exceeded",
      message: "Maximum 20 requests per second per API key"
    });
  }

  // Get or create the Project linked to this Site (for API v1 data storage)
  try {
    if (!site.organizationId) {
      logger.error({ siteId: site.siteId }, "Site has no organizationId");
      return reply.status(500).send({ error: "Site configuration error" });
    }
    const project = await getOrCreateProjectForSite(site.siteId, site.organizationId);
    request.project = project;
    request.log.info({ siteId: site.siteId, projectId: project.id, path: request.url }, "Authenticated API request");
  } catch (error) {
    logger.error(error, "Failed to get/create project for site");
    return reply.status(500).send({ error: "Internal server error" });
  }
}
