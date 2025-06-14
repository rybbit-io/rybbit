import { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { db } from "../db/postgres/postgres.js";
import { activeSessions } from "../db/postgres/schema.js";
import { eq, and } from "drizzle-orm";
import { isSiteOverLimit, TotalTrackingPayload } from "./trackingUtils.js";
import { siteConfig } from "../lib/siteConfig.js";
import { pageviewQueue } from "./pageviewQueue.js";
import UAParser from "ua-parser-js";

const sharedServerTrackingPayloadFields = {
  // Required
  site_id: z.string().min(1),
  user_id: z.string().min(1).max(255), // opt?
  session_id: z.string().min(1).max(255), // opt?
  timestamp: z.string().datetime().optional(), // remove

  // Page/URL fields
  hostname: z.string().max(253).default(""),
  pathname: z.string().max(2048).default(""),
  querystring: z.string().max(2048).default(""),
  page_title: z.string().max(512).default(""),
  referrer: z.string().max(2048).default(""),

  // Device/Browser fields
  screen_width: z.number().int().positive().default(0),
  screen_height: z.number().int().positive().default(0),
  device_type: z.enum(["Desktop", "Tablet", "Mobile"]).default("Desktop"),
  browser: z.string().max(100).default(""), // use user-agent?
  browser_version: z.string().max(50).default(""), // use user-agent?
  operating_system: z.string().max(100).default(""), // use user-agent?
  operating_system_version: z.string().max(50).default(""), // use user-agent?
  language: z.string().max(35).default(""),

  // Location fields
  country: z.string().max(2).default(""),
  region: z.string().max(6).default(""),
  city: z.string().max(100).default(""),
  lat: z.number().default(0),
  lon: z.number().default(0),

  // Traffic source fields
  channel: z.string().max(100).default("Unknown"),
  utm_source: z.string().max(255).optional(), // remove, derived from querystring
  utm_medium: z.string().max(255).optional(), // remove, derived from querystring
  utm_campaign: z.string().max(255).optional(), // remove, derived from querystring
  utm_term: z.string().max(255).optional(), // remove, derived from querystring
  utm_content: z.string().max(255).optional(), // remove, derived from querystring

  // Additional URL parameters
  url_parameters: z.record(z.string()).optional().default({}), // remove, derived from querystring

  // Session tracking
  is_new_session: z.boolean().default(false), // remove?
  session_pageviews: z.number().int().positive().default(1), // remove?
};

export const serverTrackingPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pageview"),
    ...sharedServerTrackingPayloadFields,
  }),
  z.object({
    type: z.literal("custom_event"),
    ...sharedServerTrackingPayloadFields,
    event_name: z.string().min(1).max(256),
    properties: z.record(z.any()).optional().default({}),
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

// Convert server-side payload to TotalTrackingPayload format for queue processing
// function convertToTotalTrackingPayload(payload: ServerTrackingPayload): TotalTrackingPayload {
//   const timestamp = payload.timestamp || new Date().toISOString();
//
//   // Create a mock User Agent result if browser info is provided
//   const ua: UAParser.IResult = {
//     browser: {
//       name: payload.browser || "",
//       version: payload.browser_version || "",
//       major: payload.browser_version?.split('.')[0] || ""
//     },
//     engine: { name: "", version: "" },
//     os: {
//       name: payload.operating_system || "",
//       version: payload.operating_system_version || ""
//     },
//     device: { vendor: "", model: "", type: undefined },
//     cpu: { architecture: undefined }
//   };
//
//   // Build querystring from UTM parameters and additional URL parameters
//   const urlParams = new URLSearchParams();
//   if (payload.utm_source) urlParams.set('utm_source', payload.utm_source);
//   if (payload.utm_medium) urlParams.set('utm_medium', payload.utm_medium);
//   if (payload.utm_campaign) urlParams.set('utm_campaign', payload.utm_campaign);
//   if (payload.utm_term) urlParams.set('utm_term', payload.utm_term);
//   if (payload.utm_content) urlParams.set('utm_content', payload.utm_content);
//
//   // Add additional URL parameters
//   if (payload.url_parameters) {
//     Object.entries(payload.url_parameters).forEach(([key, value]) => {
//       urlParams.set(key, value);
//     });
//   }
//
//   // Merge with existing querystring if provided
//   const existingQuery = payload.querystring || "";
//   const newQuery = urlParams.toString();
//   const finalQuerystring = existingQuery && newQuery
//     ? `${existingQuery}&${newQuery}`
//     : existingQuery || newQuery;
//
//   const totalPayload: TotalTrackingPayload = {
//     // Base tracking fields
//     site_id: payload.site_id,
//     hostname: payload.hostname || "",
//     pathname: payload.pathname || "",
//     querystring: finalQuerystring,
//     screenWidth: payload.screen_width || 0,
//     screenHeight: payload.screen_height || 0,
//     language: payload.language || "",
//     page_title: payload.page_title || "",
//     referrer: payload.referrer || "",
//     user_id: payload.user_id,
//
//     // Extended fields
//     type: payload.type,
//     event_name: payload.type === "custom_event" ? payload.event_name : undefined,
//     properties: payload.type === "custom_event" && payload.properties
//       ? JSON.stringify(payload.properties)
//       : undefined,
//
//     // Generated/system fields
//     userId: payload.user_id,
//     timestamp: timestamp,
//     sessionId: payload.session_id,
//     ua: ua,
//     ipAddress: "127.0.0.1", // Default IP for server-side (will be overridden by queue processor if needed)
//
//     // Server-side specific fields (these will be used by a modified queue processor)
//     serverSideData: {
//       country: payload.country || "",
//       region: payload.region || "",
//       city: payload.city || "",
//       lat: payload.lat || 0,
//       lon: payload.lon || 0,
//       device_type: payload.device_type || "desktop",
//       channel: payload.channel || "Direct",
//       browser_version: payload.browser_version || "",
//       operating_system_version: payload.operating_system_version || "",
//       skipGeoLookup: true, // Flag to skip IP-based geo lookup
//       skipChannelDetection: payload.channel ? true : false, // Skip if channel provided
//     }
//   };
//
//   return totalPayload;
// }

// Main server-side tracking endpoint
export async function trackServerEvent(request: FastifyRequest, reply: FastifyReply) {
  try {
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
    const correctApiKey = request.correctApiKey === true;
    const providedApiKey = request.providedApiKey;

    if (!providedApiKey) {
      return reply.status(401).send({
        success: false,
        error: "API key required for server-side tracking",
      });
    }

    if (!correctApiKey) {
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

    // Convert to TotalTrackingPayload format and add to queue
    // const totalPayload = convertToTotalTrackingPayload(validatedPayload);

    // Add to the same queue as client-side tracking
    // await pageviewQueue.add(totalPayload);

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