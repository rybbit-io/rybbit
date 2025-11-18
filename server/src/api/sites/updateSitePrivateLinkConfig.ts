import crypto from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getUserHasAdminAccessToSite } from "../../lib/auth-utils.js";
import { siteConfig } from "../../lib/siteConfig.js";

// Schema for updating API configuration
const updatePrivateLinkConfigSchema = z.object({
  action: z.enum(["generate_private_link_key", "revoke_private_link_key"]),
});

export async function updateSitePrivateLinkConfig(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: "Unauthorized" });
    }

    const { siteId } = request.params as { siteId: string };
    const parsedSiteId = parseInt(siteId, 10);

    if (isNaN(parsedSiteId)) {
      return reply.status(400).send({ success: false, error: "Invalid site ID" });
    }

    const userHasAdminAccessToSite = await getUserHasAdminAccessToSite(request, String(parsedSiteId));
    if (!userHasAdminAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    // Validate request body
    const validationResult = updatePrivateLinkConfigSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid request body",
        details: validationResult.error.flatten(),
      });
    }

    const { action } = validationResult.data;

    let updateData: any = {};

    switch (action) {
      case "generate_private_link_key":
        const privateLinkKey = `${crypto.randomBytes(6).toString("hex")}`;
        updateData.privateLinkKey = privateLinkKey;
        break;

      case "revoke_private_link_key":
        updateData.privateLinkKey = null;
        break;
    }

    // Update the site config cache
    if (action === "generate_private_link_key" || action === "revoke_private_link_key") {
      siteConfig.updateConfig(parsedSiteId, { privateLinkKey: updateData.privateLinkKey });
    }

    return reply.send({
      success: true,
      data: {
        privateLinkKey: updateData.privateLinkKey,
      },
    });
  } catch (error) {
    console.error("Error updating site dev config:", error);
    return reply.status(500).send({
      success: false,
      error: "Failed to update site API configuration",
    });
  }
}
