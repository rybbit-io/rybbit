import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { siteConfig } from "../../lib/siteConfig.js";
import { validateIPPattern } from "../../lib/ipUtils.js";

// Schema for the update request - all fields are optional but validated when present
const updateSiteConfigSchema = z.object({
  // Site settings
  public: z.boolean().optional(),
  saltUserIds: z.boolean().optional(),
  blockBots: z.boolean().optional(),
  domain: z
    .string()
    .regex(
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      "Invalid domain format. Must be a valid domain like example.com or sub.example.com"
    )
    .optional(),
  excludedIPs: z.array(z.string().trim().min(1)).max(100).optional(),
  excludedCountries: z
    .array(
      z
        .string()
        .trim()
        .length(2)
        .regex(/^[A-Z]{2}$/, "Country code must be a 2-letter ISO code (e.g., US, GB, CN)")
    )
    .max(250)
    .optional(),

  // Tags
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),

  // Analytics features
  sessionReplay: z.boolean().optional(),
  webVitals: z.boolean().optional(),
  trackErrors: z.boolean().optional(),
  trackOutbound: z.boolean().optional(),
  trackUrlParams: z.boolean().optional(),
  trackInitialPageView: z.boolean().optional(),
  trackSpaNavigation: z.boolean().optional(),
  trackIp: z.boolean().optional(),
  trackButtonClicks: z.boolean().optional(),
  trackCopy: z.boolean().optional(),
  trackFormInteractions: z.boolean().optional(),
});

type UpdateSiteConfigRequest = z.infer<typeof updateSiteConfigSchema>;

export async function updateSiteConfig(
  request: FastifyRequest<{ Params: { siteId: string }; Body: UpdateSiteConfigRequest }>,
  reply: FastifyReply
) {
  try {
    // Get siteId from path params
    const siteId = parseInt(request.params.siteId, 10);
    if (isNaN(siteId) || siteId <= 0) {
      return reply.status(400).send({
        success: false,
        error: "Invalid site ID: must be a positive integer",
      });
    }

    // Validate request body
    const validationResult = updateSiteConfigSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.flatten(),
      });
    }

    const updateData = validationResult.data;

    // Check if site exists
    const site = await db.query.sites.findFirst({
      where: eq(sites.siteId, siteId),
    });

    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    // Additional validation for excluded IPs if provided
    if (updateData.excludedIPs) {
      const validationErrors: string[] = [];
      for (const ip of updateData.excludedIPs) {
        const validation = validateIPPattern(ip);
        if (!validation.valid) {
          validationErrors.push(`${ip}: ${validation.error}`);
        }
      }

      if (validationErrors.length > 0) {
        return reply.status(400).send({
          success: false,
          error: "Invalid IP patterns",
          details: validationErrors,
        });
      }
    }

    // Build the update object - only include fields that were provided
    const dbUpdateData: any = {};

    // Map the fields that exist in both request and database
    const directMappings = [
      "public",
      "saltUserIds",
      "blockBots",
      "domain",
      "excludedIPs",
      "excludedCountries",
      "tags",
      "sessionReplay",
      "webVitals",
      "trackErrors",
      "trackOutbound",
      "trackUrlParams",
      "trackInitialPageView",
      "trackSpaNavigation",
      "trackIp",
      "trackButtonClicks",
      "trackCopy",
      "trackFormInteractions",
    ];

    for (const field of directMappings) {
      if (updateData[field as keyof typeof updateData] !== undefined) {
        dbUpdateData[field] = updateData[field as keyof typeof updateData];
      }
    }

    // Only proceed if there are fields to update
    if (Object.keys(dbUpdateData).length === 0) {
      return reply.status(400).send({
        success: false,
        error: "No fields to update",
      });
    }

    // Add updatedAt timestamp
    dbUpdateData.updatedAt = new Date().toISOString();

    // Update the database
    await db.update(sites).set(dbUpdateData).where(eq(sites.siteId, siteId));

    // Update the site config cache
    await siteConfig.updateConfig(siteId, updateData);

    // Get the updated configuration to return
    const updatedConfig = await siteConfig.getConfig(siteId);

    return reply.status(200).send({
      success: true,
      message: "Site configuration updated successfully",
      config: updatedConfig,
    });
  } catch (error) {
    console.error("Error updating site configuration:", error);

    // Check for unique constraint violation on domain
    if (String(error).includes("duplicate key value violates unique constraint")) {
      return reply.status(409).send({
        success: false,
        error: "Domain already in use",
      });
    }

    return reply.status(500).send({
      success: false,
      error: "Failed to update site configuration",
    });
  }
}
