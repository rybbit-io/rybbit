import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { SiteLifecycleError, siteConfigurationLifecycle } from "../../services/sites/siteConfigurationLifecycle.js";

const updateSiteConfigSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["web", "mobile"]).nullable().optional(),
  public: z.boolean().optional(),
  embedEnabled: z.boolean().optional(),
  saltUserIds: z.boolean().optional(),
  blockBots: z.boolean().optional(),
  firstPartyProxy: z.boolean().optional(),
  domain: z.string().min(1).max(253).optional(),
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
  excludedPaths: z.array(z.string().trim().min(1).max(2048)).max(100).optional(),
  excludedHostnames: z.array(z.string().trim().min(1).max(253)).max(100).optional(),
  excludedUserAgents: z.array(z.string().trim().min(1).max(512)).max(100).optional(),
  excludedASNs: z
    .array(
      z
        .string()
        .trim()
        .regex(/^(?:AS)?\d{1,10}$/i, "ASN must be a number, optionally prefixed with AS (e.g., AS13335 or 13335)")
        .refine(value => Number(value.replace(/^AS/i, "")) <= 4294967295, {
          message: "ASN must be at most 4294967295",
        })
    )
    .max(100)
    .optional(),
  excludedQueryParams: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(512)
        .refine(value => !value.startsWith("="), {
          message: "Query param rule must have a name before '=' (e.g., preview or utm_source=internal)",
        })
    )
    .max(100)
    .optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
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
    const siteId = Number(request.params.siteId);
    if (!Number.isInteger(siteId) || siteId <= 0) {
      return reply.status(400).send({
        success: false,
        error: "Invalid site ID: must be a positive integer",
      });
    }

    const validationResult = updateSiteConfigSchema.safeParse(request.body);
    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.flatten(),
      });
    }

    const updatedConfig = await siteConfigurationLifecycle.update(siteId, validationResult.data);

    return reply.status(200).send({
      success: true,
      message: "Site configuration updated successfully",
      config: updatedConfig,
    });
  } catch (error) {
    if (error instanceof SiteLifecycleError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        ...(error.details !== undefined && { details: error.details }),
      });
    }

    request.log.error({ err: error }, "Error updating site configuration");
    return reply.status(500).send({
      success: false,
      error: "Failed to update site configuration",
    });
  }
}
