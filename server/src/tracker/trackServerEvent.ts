import { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { DateTime } from "luxon";
import clickhouse from "../db/clickhouse/clickhouse.js";
import { db } from "../db/postgres/postgres.js";
import { activeSessions } from "../db/postgres/schema.js";
import { eq, and } from "drizzle-orm";
import { isSiteOverLimit } from "./trackingUtils.js";
import { siteConfig } from "../lib/siteConfig.js";

export const serverTrackingPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pageview"),
    // Required fields
    site_id: z.string().min(1),
    user_id: z.string().min(1).max(255),
    session_id: z.string().min(1).max(255),
    timestamp: z.string().datetime().optional(), // ISO string, defaults to now

    // Page/URL fields
    hostname: z.string().max(253).optional().default(""),
    pathname: z.string().max(2048).optional().default(""),
    querystring: z.string().max(2048).optional().default(""),
    page_title: z.string().max(512).optional().default(""),
    referrer: z.string().max(2048).optional().default(""),

    // Device/Browser fields
    screen_width: z.number().int().positive().optional().default(0),
    screen_height: z.number().int().positive().optional().default(0),
    device_type: z.enum(["desktop", "tablet", "mobile"]).optional().default("desktop"),
    browser: z.string().max(100).optional().default(""),
    browser_version: z.string().max(50).optional().default(""),
    operating_system: z.string().max(100).optional().default(""),
    operating_system_version: z.string().max(50).optional().default(""),
    language: z.string().max(35).optional().default(""),

    // Location fields
    country: z.string().max(2).optional().default(""), // ISO country code
    region: z.string().max(10).optional().default(""), // e.g., "US-CA"
    city: z.string().max(100).optional().default(""),
    lat: z.number().optional().default(0),
    lon: z.number().optional().default(0),

    // Traffic source fields
    channel: z.string().max(100).optional().default("Direct"),
    utm_source: z.string().max(255).optional(),
    utm_medium: z.string().max(255).optional(),
    utm_campaign: z.string().max(255).optional(),
    utm_term: z.string().max(255).optional(),
    utm_content: z.string().max(255).optional(),

    // Additional URL parameters as JSON object
    url_parameters: z.record(z.string()).optional().default({}),

    // Session tracking
    is_new_session: z.boolean().optional().default(false),
    session_pageviews: z.number().int().positive().optional().default(1),
  }),
  z.object({
    type: z.literal("custom_event"),
    // Required fields
    site_id: z.string().min(1),
    user_id: z.string().min(1).max(255),
    session_id: z.string().min(1).max(255),
    event_name: z.string().min(1).max(256),
    timestamp: z.string().datetime().optional(), // ISO string, defaults to now

    // Page/URL fields
    hostname: z.string().max(253).optional().default(""),
    pathname: z.string().max(2048).optional().default(""),
    querystring: z.string().max(2048).optional().default(""),
    page_title: z.string().max(512).optional().default(""),
    referrer: z.string().max(2048).optional().default(""),

    // Device/Browser fields
    screen_width: z.number().int().positive().optional().default(0),
    screen_height: z.number().int().positive().optional().default(0),
    device_type: z.enum(["desktop", "tablet", "mobile"]).optional().default("desktop"),
    browser: z.string().max(100).optional().default(""),
    browser_version: z.string().max(50).optional().default(""),
    operating_system: z.string().max(100).optional().default(""),
    operating_system_version: z.string().max(50).optional().default(""),
    language: z.string().max(35).optional().default(""),

    // Location fields
    country: z.string().max(2).optional().default(""),
    region: z.string().max(10).optional().default(""),
    city: z.string().max(100).optional().default(""),
    lat: z.number().optional().default(0),
    lon: z.number().optional().default(0),

    // Traffic source fields
    channel: z.string().max(100).optional().default("Direct"),
    utm_source: z.string().max(255).optional(),
    utm_medium: z.string().max(255).optional(),
    utm_campaign: z.string().max(255).optional(),
    utm_term: z.string().max(255).optional(),
    utm_content: z.string().max(255).optional(),

    // Event properties
    properties: z.record(z.any()).optional().default({}),

    // Additional URL parameters as JSON object
    url_parameters: z.record(z.string()).optional().default({}),

    // Session tracking
    is_new_session: z.boolean().optional().default(false),
    session_pageviews: z.number().int().positive().optional().default(1),
  }),
]);

export type ServerTrackingPayload = z.infer<typeof serverTrackingPayloadSchema>;

// Update or create session for server-side tracking
async function updateServerSession(
  payload: ServerTrackingPayload,
  isPageview: boolean = true
): Promise<void> {
  const siteIdNumber = parseInt(payload.site_id, 10);

  // Check if session exists
  const [existingSession] = await db
    .select()
    .from(activeSessions)
    .where(
      and(
        eq(activeSessions.userId, payload.user_id),
        eq(activeSessions.siteId, siteIdNumber),
        eq(activeSessions.sessionId, payload.session_id)
      )
    )
    .limit(1);

  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

  if (existingSession.userId) {
    // Update existing session
    const updateData: any = {
      lastActivity: timestamp,
    };

    // Only increment pageviews count for actual pageviews
    if (isPageview) {
      updateData.pageviews = payload.session_pageviews || (existingSession.pageviews || 0) + 1;
    }

    await db
      .update(activeSessions)
      .set(updateData)
      .where(eq(activeSessions.userId, existingSession.userId));

    return;
  }

  // Create new session if it doesn't exist or if explicitly marked as new
  if (!existingSession || payload.is_new_session) {
    const insertData = {
      sessionId: payload.session_id,
      siteId: siteIdNumber,
      userId: payload.user_id,
      hostname: payload.hostname || null,
      startTime: timestamp,
      lastActivity: timestamp,
      pageviews: isPageview ? (payload.session_pageviews || 1) : 0,
      entryPage: payload.pathname || null,
      deviceType: payload.device_type || "desktop",
      screenWidth: payload.screen_width || null,
      screenHeight: payload.screen_height || null,
      browser: payload.browser || null,
      operatingSystem: payload.operating_system || null,
      language: payload.language || null,
      referrer: payload.referrer || null,
    };

    await db.insert(activeSessions).values(insertData);
  }
}

// Process server-side tracking event and insert directly into ClickHouse
async function processServerTrackingEvent(payload: ServerTrackingPayload): Promise<void> {
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

  // Build UTM parameters object
  const utmParams: Record<string, string> = {};
  if (payload.utm_source) utmParams.utm_source = payload.utm_source;
  if (payload.utm_medium) utmParams.utm_medium = payload.utm_medium;
  if (payload.utm_campaign) utmParams.utm_campaign = payload.utm_campaign;
  if (payload.utm_term) utmParams.utm_term = payload.utm_term;
  if (payload.utm_content) utmParams.utm_content = payload.utm_content;

  // Merge UTM params with additional URL parameters
  const allUrlParams = { ...utmParams, ...(payload.url_parameters || {}) };

  // Prepare the event data for ClickHouse
  const eventData = {
    site_id: payload.site_id,
    timestamp: DateTime.fromJSDate(timestamp).toFormat("yyyy-MM-dd HH:mm:ss"),
    session_id: payload.session_id,
    user_id: payload.user_id,
    hostname: payload.hostname || "",
    pathname: payload.pathname || "",
    querystring: payload.querystring || "",
    page_title: payload.page_title || "",
    referrer: payload.referrer || "",
    channel: payload.channel || "Direct",
    browser: payload.browser || "",
    browser_version: payload.browser_version || "",
    operating_system: payload.operating_system || "",
    operating_system_version: payload.operating_system_version || "",
    language: payload.language || "",
    screen_width: payload.screen_width || 0,
    screen_height: payload.screen_height || 0,
    device_type: payload.device_type || "desktop",
    country: payload.country || "",
    region: payload.region || "",
    city: payload.city || "",
    lat: payload.lat || 0,
    lon: payload.lon || 0,
    type: payload.type,
    event_name: payload.type === "custom_event" ? payload.event_name : "",
    props: payload.type === "custom_event" ? payload.properties : undefined,
    url_parameters: allUrlParams,
  };

  // Insert directly into ClickHouse (no queue needed for server-side)
  try {
    await clickhouse.insert({
      table: "events",
      values: [eventData],
      format: "JSONEachRow",
    });
    console.log(`[Server Tracking] Event inserted for site ${payload.site_id}`);
  } catch (error) {
    console.error("Error inserting server tracking event:", error);
    throw error;
  }
}

// Main server-side tracking endpoint
export async function trackServerEvent(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Validate request body using Zod
    const validationResult = serverTrackingPayloadSchema.safeParse(request.body);

    if (!validationResult.success) {
      return reply.status(400).send({
        success: false,
        error: "Invalid payload",
        details: validationResult.error.flatten(),
      });
    }

    const validatedPayload = validationResult.data;

    // Check API key authentication (required for server-side tracking)
    const isApiKeyAuth = request.isApiKeyAuthenticated === true;
    const providedApiKey = request.providedApiKey as string | undefined;

    if (!providedApiKey) {
      return reply.status(401).send({
        success: false,
        error: "API key required for server-side tracking",
      });
    }

    if (!isApiKeyAuth) {
      console.error(
        `[Server Tracking] Request rejected for site ${validatedPayload.site_id}: Invalid API Key provided`
      );
      return reply.status(403).send({
        success: false,
        error: "Invalid API key",
      });
    }

    console.log(
      `[Server Tracking] Request for site ${validatedPayload.site_id} authenticated via API Key`
    );

    // Make sure the site config is loaded
    await siteConfig.ensureInitialized();

    // Check if the site has exceeded its monthly limit
    if (isSiteOverLimit(validatedPayload.site_id)) {
      console.log(
        `[Server Tracking] Skipping event for site ${validatedPayload.site_id} - over monthly limit`
      );
      return reply
        .status(200)
        .send("Site over monthly limit, event not tracked");
    }

    // Process the event directly (no queue needed for server-side)
    await processServerTrackingEvent(validatedPayload);

    // Update session data
    await updateServerSession(
      validatedPayload,
      validatedPayload.type === "pageview"
    );

    return reply.status(200).send({
      success: true,
      message: "Event tracked successfully",
    });

  } catch (error) {
    console.error("Error tracking server event:", error);

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "Invalid payload format",
        details: error.flatten(),
      });
    }

    return reply.status(500).send({
      success: false,
      error: "Failed to track event",
    });
  }
}