import { eq, sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { asLicenses } from "../../db/postgres/schema-appsumo.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { IS_CLOUD } from "../../lib/const.js";

/**
 * Check if AppSumo integration is enabled
 */
function isAppSumoEnabled(): boolean {
  return (
    IS_CLOUD &&
    !!process.env.APPSUMO_CLIENT_ID &&
    !!process.env.APPSUMO_CLIENT_SECRET
  );
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(code: string) {
  const tokenUrl = "https://appsumo.com/openid/token/";

  const params = new URLSearchParams({
    client_id: process.env.APPSUMO_CLIENT_ID!,
    client_secret: process.env.APPSUMO_CLIENT_SECRET!,
    redirect_uri: "https://app.rybbit.io/as/callback",
    code: code,
    grant_type: "authorization_code",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
  };
}

/**
 * Fetch license key using access token
 */
async function fetchLicenseKey(accessToken: string) {
  const licenseUrl = "https://appsumo.com/openid/license_key/";

  const response = await fetch(licenseUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch license key: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    licenseKey: data.license_key,
    tier: data.tier?.toString() || "1",
  };
}

export async function activateAppSumoLicense(
  request: FastifyRequest<{
    Body: {
      code: string;
      organizationId: string;
    };
  }>,
  reply: FastifyReply
) {
  if (!isAppSumoEnabled()) {
    return reply.status(503).send({
      error: "AppSumo integration is not available",
    });
  }

  const { code, organizationId } = request.body;

  if (!code || !organizationId) {
    return reply.status(400).send({
      error: "Missing required fields: code and organizationId",
    });
  }

  try {
    const session = await getSessionFromReq(request);

    if (!session?.user?.id) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "You must be logged in to activate a license",
      });
    }

    // Verify user is a member of the organization
    const member = await db.query.member.findFirst({
      where: (member, { and, eq }) =>
        and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
    });

    if (!member) {
      return reply.status(403).send({
        error: "You are not a member of this organization",
      });
    }

    // Step 1: Exchange authorization code for access token
    let tokenData;
    try {
      tokenData = await exchangeCodeForToken(code);
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      return reply.status(400).send({
        error: "Failed to exchange authorization code",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Step 2: Fetch license key using access token
    let licenseData;
    try {
      licenseData = await fetchLicenseKey(tokenData.accessToken);
    } catch (error) {
      console.error("Error fetching license key:", error);
      return reply.status(400).send({
        error: "Failed to fetch license key",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Step 3: Check if license already exists
    const existingLicense = await db.execute(
      sql`SELECT organization_id FROM appsumo.licenses WHERE license_key = ${licenseData.licenseKey} LIMIT 1`
    );

    if (Array.isArray(existingLicense) && existingLicense.length > 0) {
      const existing = existingLicense[0] as any;
      // If organization_id is already set, license is already activated
      if (existing.organization_id !== null) {
        return reply.status(409).send({
          error: "License already activated",
          message: "This license key has already been activated for another organization",
        });
      }

      // License exists as placeholder (from purchase webhook) - update it
      await db.execute(sql`
        UPDATE appsumo.licenses
        SET
          organization_id = ${organizationId},
          tier = ${licenseData.tier},
          status = 'active',
          activated_at = NOW(),
          updated_at = NOW()
        WHERE license_key = ${licenseData.licenseKey}
      `);
    } else {
      // Step 4: License doesn't exist - create new record
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
          ${licenseData.licenseKey},
          ${licenseData.tier},
          'active',
          NOW(),
          NOW(),
          NOW()
        )
      `);
    }

    return reply.status(200).send({
      success: true,
      license: {
        licenseKey: licenseData.licenseKey,
        tier: licenseData.tier,
        status: "active",
      },
    });
  } catch (error) {
    console.error("Error activating AppSumo license:", error);
    return reply.status(500).send({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
