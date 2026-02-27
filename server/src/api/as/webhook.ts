import { sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { IS_CLOUD } from "../../lib/const.js";
import { logger } from "../../lib/logger/logger.js";

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

  const validEvents = ["purchase", "activate", "upgrade", "downgrade", "deactivate", "migrate", "test"];
  if (!validEvents.includes(payload.event)) {
    throw new Error(`Invalid event type: ${payload.event}`);
  }

  return true;
}

export async function handleAppSumoWebhook(
  request: FastifyRequest<{
    Body: AppSumoWebhookPayload;
  }>,
  reply: FastifyReply
) {
  if (!isAppSumoEnabled()) {
    logger.info("[AppSumo] Integration not enabled");
    return reply.status(503).send({
      error: "AppSumo integration is not available",
    });
  }

  const payload = request.body;
  logger.info({ payload }, "[AppSumo] Received webhook");

  // Handle test webhook for AppSumo validation
  if (payload.test === true || payload.event === "test") {
    logger.info("[AppSumo] Test webhook received");
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

    logger.info(`[AppSumo] Processing ${event} event for license ${license_key}`);

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
        logger.info(`[AppSumo] Handling purchase event for license ${license_key}, tier ${tier}`);
        await handlePurchaseEvent(license_key, tier, parent_license_key);
        break;

      case "activate":
        // License activated by user
        // Note: license_status is "inactive" in webhook, becomes active after our 200 response
        logger.info(`[AppSumo] Handling activate event for license ${license_key}, tier ${tier}`);
        await handleActivateEvent(license_key, tier);
        break;

      case "upgrade":
        // License upgraded to higher tier
        // Note: Creates NEW license_key with prev_license_key pointing to old one
        // AppSumo sends simultaneous deactivate event for old license (we skip it)
        logger.info(`[AppSumo] Handling upgrade event: ${prev_license_key} -> ${license_key}, tier ${tier}`);
        await handleUpgradeEvent(license_key, tier, prev_license_key);
        break;

      case "downgrade":
        // License downgraded to lower tier
        // Note: Creates NEW license_key with prev_license_key pointing to old one
        // AppSumo sends simultaneous deactivate event for old license (we skip it)
        logger.info(`[AppSumo] Handling downgrade event: ${prev_license_key} -> ${license_key}, tier ${tier}`);
        await handleDowngradeEvent(license_key, tier, prev_license_key);
        break;

      case "deactivate":
        // License refunded or canceled
        // Note: license_status is "active" in webhook (for refunds), becomes deactivated after our 200 response
        // For upgrade/downgrade, license_status is already "deactivated" - we skip these
        const isUpgradeOrDowngradeDeactivation =
          extra?.reason === "Upgraded by customer" || extra?.reason === "Downgraded by customer";
        logger.info(
          `[AppSumo] Deactivate event for ${license_key}, reason: ${extra?.reason}, skipping: ${isUpgradeOrDowngradeDeactivation}`
        );
        if (!isUpgradeOrDowngradeDeactivation) {
          await handleDeactivateEvent(license_key);
        }
        break;

      case "migrate":
        // Add-on migration when parent license is upgraded/downgraded
        // Note: parent_license_key is updated to point to new parent license
        logger.info(`[AppSumo] Handling migrate event for ${license_key}, parent: ${parent_license_key}`);
        await handleMigrateEvent(license_key, tier, parent_license_key);
        break;

      default:
        console.warn(`[AppSumo] Unknown AppSumo webhook event: ${event}`);
    }

    // Return success response as required by AppSumo
    logger.info(`[AppSumo] Successfully processed ${event} event for ${license_key}`);
    return reply.status(200).send({
      event: event,
      success: true,
    });
  } catch (error) {
    console.error("[AppSumo] Error processing AppSumo webhook:", error);

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
async function handlePurchaseEvent(licenseKey: string, tier: any, parentLicenseKey?: string) {
  const tierValue = tier?.toString() || "1";
  logger.info(
    `[AppSumo] handlePurchaseEvent - license: ${licenseKey}, tier: ${tierValue}, parent: ${parentLicenseKey}`
  );

  // Check if license already exists
  const existing = await db.execute(sql`SELECT id FROM appsumo.licenses WHERE license_key = ${licenseKey} LIMIT 1`);

  if (Array.isArray(existing) && existing.length === 0) {
    // Create placeholder - will be linked to org when user activates
    logger.info(`[AppSumo] Creating new pending license ${licenseKey}`);
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
    logger.info(`[AppSumo] Successfully created pending license ${licenseKey}`);
  } else {
    logger.info(`[AppSumo] License ${licenseKey} already exists, skipping`);
  }
}

/**
 * Handle activate event - update license status
 */
async function handleActivateEvent(licenseKey: string, tier: any) {
  const tierValue = tier?.toString() || "1";
  logger.info(`[AppSumo] handleActivateEvent - license: ${licenseKey}, tier: ${tierValue}`);

  await db.execute(sql`
    UPDATE appsumo.licenses
    SET
      status = 'active',
      tier = ${tierValue},
      activated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
  logger.info(`[AppSumo] Successfully activated license ${licenseKey}`);
}

/**
 * Handle upgrade event - create new license and transfer organization
 */
async function handleUpgradeEvent(licenseKey: string, tier: any, prevLicenseKey?: string) {
  const tierValue = tier?.toString() || "1";
  logger.info(
    `[AppSumo] handleUpgradeEvent - new license: ${licenseKey}, prev license: ${prevLicenseKey}, tier: ${tierValue}`
  );

  if (!prevLicenseKey) {
    console.warn("[AppSumo] No prev_license_key provided for upgrade event");
    return;
  }

  // Get the old license to find the organization
  logger.info(`[AppSumo] Querying old license: ${prevLicenseKey}`);
  let oldLicenseResult = await db.execute(
    sql`SELECT organization_id FROM appsumo.licenses WHERE license_key = ${prevLicenseKey} LIMIT 1`
  );

  logger.info({ oldLicenseResult }, "[AppSumo] Old license query result");

  // If previous license not found, try to find ANY license with an organization (fallback for missed webhooks)
  if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
    console.warn(
      `[AppSumo] Old license not found: ${prevLicenseKey}, searching for any license with organization as fallback`
    );
    oldLicenseResult = await db.execute(
      sql`SELECT organization_id FROM appsumo.licenses WHERE organization_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1`
    );

    if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
      console.error(`[AppSumo] No licenses with organization found, cannot process upgrade`);
      return;
    }
    logger.info({ oldLicenseResult }, "[AppSumo] Found fallback license");
  }

  const oldLicense = oldLicenseResult[0] as any;
  const organizationId = oldLicense.organization_id;
  logger.info(`[AppSumo] Found old license with organization_id: ${organizationId}`);

  // Create new license with the organization transferred
  if (organizationId) {
    // Organization exists - create active license
    logger.info(`[AppSumo] Organization exists - creating active license for ${licenseKey}`);
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
      logger.info(`[AppSumo] Successfully created/updated active license ${licenseKey}`);
    } catch (error) {
      console.error(`[AppSumo] Error creating active license:`, error);
      throw error;
    }
  } else {
    // No organization yet - create pending license
    logger.info(`[AppSumo] No organization - creating pending license for ${licenseKey}`);
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
      logger.info(`[AppSumo] Successfully created/updated pending license ${licenseKey}`);
    } catch (error) {
      console.error(`[AppSumo] Error creating pending license:`, error);
      throw error;
    }
  }

  // Deactivate the old license
  logger.info(`[AppSumo] Deactivating old license ${prevLicenseKey}`);
  try {
    await db.execute(sql`
      UPDATE appsumo.licenses
      SET
        status = 'inactive',
        deactivated_at = NOW(),
        updated_at = NOW()
      WHERE license_key = ${prevLicenseKey}
    `);
    logger.info(`[AppSumo] Successfully deactivated old license ${prevLicenseKey}`);
  } catch (error) {
    console.error(`[AppSumo] Error deactivating old license:`, error);
    throw error;
  }
}

/**
 * Handle downgrade event - create new license and transfer organization
 */
async function handleDowngradeEvent(licenseKey: string, tier: any, prevLicenseKey?: string) {
  const tierValue = tier?.toString() || "1";
  logger.info(
    `[AppSumo] handleDowngradeEvent - new license: ${licenseKey}, prev license: ${prevLicenseKey}, tier: ${tierValue}`
  );

  if (!prevLicenseKey) {
    console.warn("[AppSumo] No prev_license_key provided for downgrade event");
    return;
  }

  // Get the old license to find the organization
  logger.info(`[AppSumo] Querying old license: ${prevLicenseKey}`);
  let oldLicenseResult = await db.execute(
    sql`SELECT organization_id FROM appsumo.licenses WHERE license_key = ${prevLicenseKey} LIMIT 1`
  );

  logger.info({ oldLicenseResult }, "[AppSumo] Old license query result");

  // If previous license not found, try to find ANY license with an organization (fallback for missed webhooks)
  if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
    console.warn(
      `[AppSumo] Old license not found: ${prevLicenseKey}, searching for any license with organization as fallback`
    );
    oldLicenseResult = await db.execute(
      sql`SELECT organization_id FROM appsumo.licenses WHERE organization_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1`
    );

    if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
      console.error(`[AppSumo] No licenses with organization found, cannot process downgrade`);
      return;
    }
    logger.info({ oldLicenseResult }, "[AppSumo] Found fallback license");
  }

  const oldLicense = oldLicenseResult[0] as any;
  const organizationId = oldLicense.organization_id;
  logger.info(`[AppSumo] Found old license with organization_id: ${organizationId}`);

  // Create new license with the organization transferred
  if (organizationId) {
    // Organization exists - create active license
    logger.info(`[AppSumo] Organization exists - creating active license for ${licenseKey}`);
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
      logger.info(`[AppSumo] Successfully created/updated active license ${licenseKey}`);
    } catch (error) {
      console.error(`[AppSumo] Error creating active license:`, error);
      throw error;
    }
  } else {
    // No organization yet - create pending license
    logger.info(`[AppSumo] No organization - creating pending license for ${licenseKey}`);
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
      logger.info(`[AppSumo] Successfully created/updated pending license ${licenseKey}`);
    } catch (error) {
      console.error(`[AppSumo] Error creating pending license:`, error);
      throw error;
    }
  }

  // Deactivate the old license
  logger.info(`[AppSumo] Deactivating old license ${prevLicenseKey}`);
  try {
    await db.execute(sql`
      UPDATE appsumo.licenses
      SET
        status = 'inactive',
        deactivated_at = NOW(),
        updated_at = NOW()
      WHERE license_key = ${prevLicenseKey}
    `);
    logger.info(`[AppSumo] Successfully deactivated old license ${prevLicenseKey}`);
  } catch (error) {
    console.error(`[AppSumo] Error deactivating old license:`, error);
    throw error;
  }
}

/**
 * Handle deactivate event - mark license as inactive
 */
async function handleDeactivateEvent(licenseKey: string) {
  logger.info(`[AppSumo] handleDeactivateEvent - license: ${licenseKey}`);
  await db.execute(sql`
    UPDATE appsumo.licenses
    SET
      status = 'inactive',
      deactivated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
  logger.info(`[AppSumo] Successfully deactivated license ${licenseKey}`);
}

/**
 * Handle migrate event - update parent license for add-ons
 */
async function handleMigrateEvent(licenseKey: string, tier: any, parentLicenseKey?: string) {
  const tierValue = tier?.toString() || "1";
  logger.info(`[AppSumo] handleMigrateEvent - license: ${licenseKey}, tier: ${tierValue}, parent: ${parentLicenseKey}`);

  await db.execute(sql`
    UPDATE appsumo.licenses
    SET
      tier = ${tierValue},
      parent_license_key = ${parentLicenseKey || null},
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
  logger.info(`[AppSumo] Successfully migrated license ${licenseKey}`);
}
