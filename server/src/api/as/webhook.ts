import { sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { IS_CLOUD } from "../../lib/const.js";

interface AppSumoWebhookPayload {
  test?: boolean;
  event: string;
  license_key: string;
  prev_license_key?: string; // Used in upgrade/downgrade events
  event_timestamp?: number; // Unix timestamp in milliseconds
  created_at?: number; // Unix timestamp in seconds
  license_status?: string;
  tier?: string | number;
  extra?: {
    reason?: string;
  };
  // Deal add-on specific fields
  partner_plan_name?: string;
  parent_license_key?: string;
  unit_quantity?: number;
}

const APPSUMO_EVENT_TYPES = ["purchase", "activate", "upgrade", "downgrade", "deactivate", "migrate", "test"] as const;

function eventTypeForLog(event: unknown): string {
  return typeof event === "string" && APPSUMO_EVENT_TYPES.includes(event as (typeof APPSUMO_EVENT_TYPES)[number])
    ? event
    : "invalid";
}

function tierForLog(tier: unknown): string | undefined {
  return typeof tier === "string" || typeof tier === "number" ? String(tier) : undefined;
}

/**
 * Check if AppSumo integration is enabled
 */
function isAppSumoEnabled(): boolean {
  return IS_CLOUD && !!process.env.APPSUMO_CLIENT_ID && !!process.env.APPSUMO_CLIENT_SECRET;
}

/**
 * Validate webhook payload
 */
function validateWebhookPayload(payload: AppSumoWebhookPayload): boolean {
  if (!payload.license_key) {
    throw new Error("Missing license_key in webhook payload");
  }

  if (!payload.event) {
    throw new Error("Missing event in webhook payload");
  }

  if (!APPSUMO_EVENT_TYPES.includes(payload.event as (typeof APPSUMO_EVENT_TYPES)[number])) {
    throw new Error("Invalid AppSumo event type");
  }

  return true;
}

export async function handleAppSumoWebhook(
  request: FastifyRequest<{
    Body: AppSumoWebhookPayload;
  }>,
  reply: FastifyReply
) {
  const requestLogger = request.log.child({ integration: "appsumo" });

  if (!isAppSumoEnabled()) {
    requestLogger.info("Integration not enabled");
    return reply.status(503).send({
      error: "AppSumo integration is not available",
    });
  }

  const payload = request.body;
  requestLogger.info(
    {
      eventType: eventTypeForLog(payload.event),
      tier: tierForLog(payload.tier),
      isTest: payload.test === true || payload.event === "test",
      hasPreviousLicense: Boolean(payload.prev_license_key),
      hasParentLicense: Boolean(payload.parent_license_key),
    },
    "Received AppSumo webhook"
  );

  // Handle test webhook for AppSumo validation
  if (payload.test === true || payload.event === "test") {
    requestLogger.info("Test webhook received");
    return reply.status(200).send({
      event: "test",
      success: true,
    });
  }

  try {
    // Validate webhook payload
    validateWebhookPayload(payload);

    const { license_key, event, tier, parent_license_key, prev_license_key, license_status, event_timestamp, extra } =
      payload;

    requestLogger.info({ eventType: event, tier: tierForLog(tier) }, "Processing webhook event");

    // Log webhook event for audit trail
    await db.execute(sql`
      INSERT INTO appsumo.webhook_events (
        license_key,
        event,
        payload,
        processed_at,
        created_at
      ) VALUES (
        ${license_key},
        ${event},
        ${JSON.stringify(payload)},
        NOW(),
        NOW()
      )
    `);

    // Process the webhook based on event type
    switch (event) {
      case "purchase":
        // License purchased - create placeholder record
        // Note: license_status will be "inactive" until user activates
        requestLogger.info({ eventType: event, tier: tierForLog(tier) }, "Handling webhook event");
        await handlePurchaseEvent(requestLogger, license_key, tier, parent_license_key);
        break;

      case "activate":
        // License activated by user
        // Note: license_status is "inactive" in webhook, becomes active after our 200 response
        requestLogger.info({ eventType: event, tier: tierForLog(tier) }, "Handling webhook event");
        await handleActivateEvent(requestLogger, license_key, tier);
        break;

      case "upgrade":
        // License upgraded to higher tier
        // Note: Creates NEW license_key with prev_license_key pointing to old one
        // AppSumo sends simultaneous deactivate event for old license (we skip it)
        requestLogger.info(
          { eventType: event, tier: tierForLog(tier), hasPreviousLicense: Boolean(prev_license_key) },
          "Handling webhook event"
        );
        await handleUpgradeEvent(requestLogger, license_key, tier, prev_license_key);
        break;

      case "downgrade":
        // License downgraded to lower tier
        // Note: Creates NEW license_key with prev_license_key pointing to old one
        // AppSumo sends simultaneous deactivate event for old license (we skip it)
        requestLogger.info(
          { eventType: event, tier: tierForLog(tier), hasPreviousLicense: Boolean(prev_license_key) },
          "Handling webhook event"
        );
        await handleDowngradeEvent(requestLogger, license_key, tier, prev_license_key);
        break;

      case "deactivate":
        // License refunded or canceled
        // Note: license_status is "active" in webhook (for refunds), becomes deactivated after our 200 response
        // For upgrade/downgrade, license_status is already "deactivated" - we skip these
        const isUpgradeOrDowngradeDeactivation =
          extra?.reason === "Upgraded by customer" || extra?.reason === "Downgraded by customer";
        requestLogger.info(
          {
            eventType: event,
            deactivationCategory: isUpgradeOrDowngradeDeactivation ? "plan_change" : "other",
            skipped: isUpgradeOrDowngradeDeactivation,
          },
          "Handling webhook event"
        );
        if (!isUpgradeOrDowngradeDeactivation) {
          await handleDeactivateEvent(requestLogger, license_key);
        }
        break;

      case "migrate":
        // Add-on migration when parent license is upgraded/downgraded
        // Note: parent_license_key is updated to point to new parent license
        requestLogger.info(
          { eventType: event, tier: tierForLog(tier), hasParentLicense: Boolean(parent_license_key) },
          "Handling webhook event"
        );
        await handleMigrateEvent(requestLogger, license_key, tier, parent_license_key);
        break;

      default:
        requestLogger.warn({ eventType: event }, "Unknown AppSumo webhook event");
    }

    // Return success response as required by AppSumo
    requestLogger.info({ eventType: event }, "Successfully processed webhook event");
    return reply.status(200).send({
      event: event,
      success: true,
    });
  } catch (error) {
    requestLogger.error({ err: error, eventType: eventTypeForLog(payload.event) }, "Error processing AppSumo webhook");

    // Still return 200 to acknowledge receipt, but log the error
    return reply.status(200).send({
      event: payload.event || "unknown",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handle purchase event - create placeholder license record
 */
async function handlePurchaseEvent(
  requestLogger: FastifyBaseLogger,
  licenseKey: string,
  tier: any,
  parentLicenseKey?: string
) {
  const tierValue = tier?.toString() || "1";
  requestLogger.info({ tier: tierValue, hasParentLicense: Boolean(parentLicenseKey) }, "Handling purchase event");

  // Check if license already exists
  const existing = await db.execute(sql`SELECT id FROM appsumo.licenses WHERE license_key = ${licenseKey} LIMIT 1`);

  if (Array.isArray(existing) && existing.length === 0) {
    // Create placeholder - will be linked to org when user activates
    requestLogger.info({ tier: tierValue }, "Creating pending license");
    await db.execute(sql`
      INSERT INTO appsumo.licenses (
        organization_id,
        license_key,
        tier,
        status,
        parent_license_key,
        created_at,
        updated_at
      ) VALUES (
        NULL,
        ${licenseKey},
        ${tierValue},
        'pending',
        ${parentLicenseKey || null},
        NOW(),
        NOW()
      )
      ON CONFLICT (license_key) DO NOTHING
    `);
    requestLogger.info({ tier: tierValue }, "Successfully created pending license");
  } else {
    requestLogger.info("License already exists; skipping pending license creation");
  }
}

/**
 * Handle activate event - update license status
 */
async function handleActivateEvent(requestLogger: FastifyBaseLogger, licenseKey: string, tier: any) {
  const tierValue = tier?.toString() || "1";
  requestLogger.info({ tier: tierValue }, "Handling activate event");

  await db.execute(sql`
    UPDATE appsumo.licenses
    SET
      status = 'active',
      tier = ${tierValue},
      activated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
  requestLogger.info({ tier: tierValue }, "Successfully activated license");
}

/**
 * Handle upgrade event - create new license and transfer organization
 */
async function handleUpgradeEvent(
  requestLogger: FastifyBaseLogger,
  licenseKey: string,
  tier: any,
  prevLicenseKey?: string
) {
  const tierValue = tier?.toString() || "1";
  requestLogger.info({ tier: tierValue, hasPreviousLicense: Boolean(prevLicenseKey) }, "Handling upgrade event");

  if (!prevLicenseKey) {
    requestLogger.warn("No previous license provided for upgrade event");
    return;
  }

  // Get the old license to find the organization
  requestLogger.debug("Looking up previous license for upgrade");
  let oldLicenseResult = await db.execute(
    sql`SELECT organization_id FROM appsumo.licenses WHERE license_key = ${prevLicenseKey} LIMIT 1`
  );

  requestLogger.debug(
    { previousLicenseMatchCount: Array.isArray(oldLicenseResult) ? oldLicenseResult.length : 0 },
    "Previous license lookup completed"
  );

  // If previous license not found, try to find ANY license with an organization (fallback for missed webhooks)
  if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
    requestLogger.warn("Previous license not found; searching for an organization fallback");
    oldLicenseResult = await db.execute(
      sql`SELECT organization_id FROM appsumo.licenses WHERE organization_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1`
    );

    if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
      requestLogger.error("No licenses with an organization found; cannot process upgrade");
      return;
    }
    requestLogger.info("Found fallback license for upgrade");
  }

  const oldLicense = oldLicenseResult[0] as any;
  const organizationId = oldLicense.organization_id;
  requestLogger.info({ organizationId }, "Found organization for previous license");

  // Create new license with the organization transferred
  if (organizationId) {
    // Organization exists - create active license
    requestLogger.info({ organizationId, tier: tierValue }, "Creating active license for organization");
    try {
      await db.execute(sql`
        INSERT INTO appsumo.licenses (
          organization_id,
          license_key,
          tier,
          status,
          activated_at,
          created_at,
          updated_at
        ) VALUES (
          ${organizationId},
          ${licenseKey},
          ${tierValue},
          'active',
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (license_key) DO UPDATE SET
          organization_id = ${organizationId},
          tier = ${tierValue},
          status = 'active',
          activated_at = NOW(),
          updated_at = NOW()
      `);
      requestLogger.info({ organizationId, tier: tierValue }, "Successfully created or updated active license");
    } catch (error) {
      requestLogger.error({ err: error, organizationId }, "Error creating active license");
      throw error;
    }
  } else {
    // No organization yet - create pending license
    requestLogger.info({ tier: tierValue }, "Creating pending license without an organization");
    try {
      await db.execute(sql`
        INSERT INTO appsumo.licenses (
          organization_id,
          license_key,
          tier,
          status,
          created_at,
          updated_at
        ) VALUES (
          NULL,
          ${licenseKey},
          ${tierValue},
          'pending',
          NOW(),
          NOW()
        )
        ON CONFLICT (license_key) DO UPDATE SET
          tier = ${tierValue},
          status = 'pending',
          updated_at = NOW()
      `);
      requestLogger.info({ tier: tierValue }, "Successfully created or updated pending license");
    } catch (error) {
      requestLogger.error({ err: error }, "Error creating pending license");
      throw error;
    }
  }

  // Deactivate the old license
  requestLogger.info("Deactivating previous license");
  try {
    await db.execute(sql`
      UPDATE appsumo.licenses
      SET
        status = 'inactive',
        deactivated_at = NOW(),
        updated_at = NOW()
      WHERE license_key = ${prevLicenseKey}
    `);
    requestLogger.info("Successfully deactivated previous license");
  } catch (error) {
    requestLogger.error({ err: error }, "Error deactivating previous license");
    throw error;
  }
}

/**
 * Handle downgrade event - create new license and transfer organization
 */
async function handleDowngradeEvent(
  requestLogger: FastifyBaseLogger,
  licenseKey: string,
  tier: any,
  prevLicenseKey?: string
) {
  const tierValue = tier?.toString() || "1";
  requestLogger.info({ tier: tierValue, hasPreviousLicense: Boolean(prevLicenseKey) }, "Handling downgrade event");

  if (!prevLicenseKey) {
    requestLogger.warn("No previous license provided for downgrade event");
    return;
  }

  // Get the old license to find the organization
  requestLogger.debug("Looking up previous license for downgrade");
  let oldLicenseResult = await db.execute(
    sql`SELECT organization_id FROM appsumo.licenses WHERE license_key = ${prevLicenseKey} LIMIT 1`
  );

  requestLogger.debug(
    { previousLicenseMatchCount: Array.isArray(oldLicenseResult) ? oldLicenseResult.length : 0 },
    "Previous license lookup completed"
  );

  // If previous license not found, try to find ANY license with an organization (fallback for missed webhooks)
  if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
    requestLogger.warn("Previous license not found; searching for an organization fallback");
    oldLicenseResult = await db.execute(
      sql`SELECT organization_id FROM appsumo.licenses WHERE organization_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1`
    );

    if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
      requestLogger.error("No licenses with an organization found; cannot process downgrade");
      return;
    }
    requestLogger.info("Found fallback license for downgrade");
  }

  const oldLicense = oldLicenseResult[0] as any;
  const organizationId = oldLicense.organization_id;
  requestLogger.info({ organizationId }, "Found organization for previous license");

  // Create new license with the organization transferred
  if (organizationId) {
    // Organization exists - create active license
    requestLogger.info({ organizationId, tier: tierValue }, "Creating active license for organization");
    try {
      await db.execute(sql`
        INSERT INTO appsumo.licenses (
          organization_id,
          license_key,
          tier,
          status,
          activated_at,
          created_at,
          updated_at
        ) VALUES (
          ${organizationId},
          ${licenseKey},
          ${tierValue},
          'active',
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (license_key) DO UPDATE SET
          organization_id = ${organizationId},
          tier = ${tierValue},
          status = 'active',
          activated_at = NOW(),
          updated_at = NOW()
      `);
      requestLogger.info({ organizationId, tier: tierValue }, "Successfully created or updated active license");
    } catch (error) {
      requestLogger.error({ err: error, organizationId }, "Error creating active license");
      throw error;
    }
  } else {
    // No organization yet - create pending license
    requestLogger.info({ tier: tierValue }, "Creating pending license without an organization");
    try {
      await db.execute(sql`
        INSERT INTO appsumo.licenses (
          organization_id,
          license_key,
          tier,
          status,
          created_at,
          updated_at
        ) VALUES (
          NULL,
          ${licenseKey},
          ${tierValue},
          'pending',
          NOW(),
          NOW()
        )
        ON CONFLICT (license_key) DO UPDATE SET
          tier = ${tierValue},
          status = 'pending',
          updated_at = NOW()
      `);
      requestLogger.info({ tier: tierValue }, "Successfully created or updated pending license");
    } catch (error) {
      requestLogger.error({ err: error }, "Error creating pending license");
      throw error;
    }
  }

  // Deactivate the old license
  requestLogger.info("Deactivating previous license");
  try {
    await db.execute(sql`
      UPDATE appsumo.licenses
      SET
        status = 'inactive',
        deactivated_at = NOW(),
        updated_at = NOW()
      WHERE license_key = ${prevLicenseKey}
    `);
    requestLogger.info("Successfully deactivated previous license");
  } catch (error) {
    requestLogger.error({ err: error }, "Error deactivating previous license");
    throw error;
  }
}

/**
 * Handle deactivate event - mark license as inactive
 */
async function handleDeactivateEvent(requestLogger: FastifyBaseLogger, licenseKey: string) {
  requestLogger.info("Handling deactivate event");
  await db.execute(sql`
    UPDATE appsumo.licenses
    SET
      status = 'inactive',
      deactivated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
  requestLogger.info("Successfully deactivated license");
}

/**
 * Handle migrate event - update parent license for add-ons
 */
async function handleMigrateEvent(
  requestLogger: FastifyBaseLogger,
  licenseKey: string,
  tier: any,
  parentLicenseKey?: string
) {
  const tierValue = tier?.toString() || "1";
  requestLogger.info({ tier: tierValue, hasParentLicense: Boolean(parentLicenseKey) }, "Handling migrate event");

  await db.execute(sql`
    UPDATE appsumo.licenses
    SET
      tier = ${tierValue},
      parent_license_key = ${parentLicenseKey || null},
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
  requestLogger.info({ tier: tierValue }, "Successfully migrated license");
}
