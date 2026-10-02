import { randomBytes } from "node:crypto";
import { higherRole, roleHasPermission } from "@rybbit/shared";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { gscConnections, organization, sites, siteTransfers, user } from "../../db/postgres/schema.js";
import { effectiveOrgRole, getOrgMembership } from "../../lib/access.js";
import { getIsUserAdmin } from "../../lib/auth-utils.js";
import { IS_CLOUD } from "../../lib/const.js";
import { sendSiteTransferEmail } from "../../lib/email/email.js";
import { claimExpiryIso as utcIso } from "../../services/sites/claimExpiry.js";
import { withOrganizationSiteLock } from "../../services/sites/withOrganizationSiteLock.js";
import { applySiteMove, invalidateSiteMoveAccess, lockSiteOwnership } from "./applySiteMove.js";
import { getPlanSiteLimit, targetSiteLimitError } from "./siteLimit.js";

/**
 * Handing a site to someone outside its organization.
 *
 * An admin of the site's organization names a recipient by email (the
 * sites:transfer permission, enforced by the route guard). The recipient opens
 * the emailed link, signed in with that email address, and picks an
 * organization where they hold sites:create; the site then moves exactly as
 * PUT /sites/:siteId/move moves it. Neither side needs a seat in the other's
 * organization.
 *
 * The transfer id is the secret in the link — like an invitation id, it is
 * only ever sent to the recipient's inbox (and shown to the sender so they can
 * pass it on themselves when the instance cannot send email).
 */

const TRANSFER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createTransferSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const acceptTransferSchema = z.object({
  organizationId: z.string().min(1),
});

type TransferRow = typeof siteTransfers.$inferSelect;

const transferUrl = (transferId: string) => `${process.env.BASE_URL ?? ""}/transfer/${transferId}`;

// Postgres hands timestamps back without a zone; they are UTC.
const isExpired = (transfer: Pick<TransferRow, "expiresAt">) => Date.parse(utcIso(transfer.expiresAt)!) <= Date.now();

function serializeForSender(transfer: TransferRow) {
  return {
    id: transfer.id,
    recipientEmail: transfer.recipientEmail,
    createdAt: utcIso(transfer.createdAt),
    expiresAt: utcIso(transfer.expiresAt),
    url: transferUrl(transfer.id),
  };
}

function parseSiteId(raw: string): number | null {
  const siteId = Number(raw);
  return Number.isInteger(siteId) && siteId > 0 ? siteId : null;
}

// ---- Sender (site admin) ----------------------------------------------------

/** POST /sites/:siteId/transfer — start (or replace) the site's pending transfer. */
export async function createSiteTransfer(
  request: FastifyRequest<{ Params: { siteId: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const siteId = parseSiteId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }
  const parsed = createTransferSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "A valid recipient email is required" });
  }
  // Like moving a site, handing it over is a person's decision: an
  // organization-owned API key carries no user and cannot start one.
  if (!request.user?.id) {
    return reply.status(401).send({ error: "Transfers must be started by a signed-in user" });
  }

  const senderId = request.user.id;

  try {
    // Which organization row to lock; re-checked once the locks are held.
    const unlocked = await db.query.sites.findFirst({
      where: eq(sites.siteId, siteId),
      columns: { organizationId: true },
    });
    if (!unlocked?.organizationId) {
      return reply.status(404).send({ error: "Site not found" });
    }
    const sourceOrganizationId = unlocked.organizationId;
    // Resolved before the transaction: it must not wait on a second connection.
    const isSystemAdmin = !request.bearerAuth && (await getIsUserAdmin(request));

    // Lock order for every ownership change: organization row, site row,
    // transfer rows.
    const outcome = await withOrganizationSiteLock(sourceOrganizationId, async tx => {
      // The route guard checked the caller against the site's organization
      // as it was when the request arrived; check again against the one it is
      // in now, holding the site row so it can't move until this commits.
      const site = await lockSiteOwnership(tx, siteId);
      if (!site?.organizationId) {
        return { ok: false as const, status: 404, error: "Site not found" };
      }
      if (site.organizationId !== sourceOrganizationId) {
        return {
          ok: false as const,
          status: 409,
          error: "The site moved while this request was in flight; reload and try again",
        };
      }
      const role = higherRole(
        effectiveOrgRole(await getOrgMembership(senderId, sourceOrganizationId, tx)),
        isSystemAdmin ? "admin" : null
      );
      if (!roleHasPermission(role, "sites:transfer")) {
        return { ok: false as const, status: 403, error: "Forbidden" };
      }

      const transfer: TransferRow = {
        id: randomBytes(24).toString("base64url"),
        siteId,
        sourceOrganizationId: site.organizationId,
        recipientEmail: parsed.data.email,
        createdBy: senderId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + TRANSFER_TTL_MS).toISOString(),
      };
      // One pending transfer per site: a new one replaces (and so revokes) the old.
      await tx.delete(siteTransfers).where(eq(siteTransfers.siteId, siteId));
      await tx.insert(siteTransfers).values(transfer);
      return { ok: true as const, transfer, siteDomain: site.domain };
    });

    if (!outcome.ok) {
      return reply.status(outcome.status).send({ error: outcome.error });
    }
    const { transfer, siteDomain } = outcome;
    const sourceOrg = await db.query.organization.findFirst({
      where: eq(organization.id, transfer.sourceOrganizationId),
      columns: { name: true },
    });

    const sender = await db.query.user.findFirst({ where: eq(user.id, senderId), columns: { email: true } });
    try {
      await sendSiteTransferEmail({
        email: transfer.recipientEmail,
        sentBy: sender?.email ?? sourceOrg?.name ?? "A Rybbit user",
        siteDomain,
        organizationName: sourceOrg?.name ?? "",
        transferLink: transferUrl(transfer.id),
      });
    } catch (error) {
      // The link is still returned for the sender to pass on themselves.
      request.log.error({ err: error, siteId }, "Could not send site transfer email");
    }

    return reply.status(201).send(serializeForSender(transfer));
  } catch (error) {
    request.log.error({ err: error, siteId }, "Error creating site transfer");
    return reply.status(500).send({ error: "Failed to start the transfer" });
  }
}

/** GET /sites/:siteId/transfer — the site's pending transfer, or null. */
export async function getSiteTransfer(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const siteId = parseSiteId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }
  const transfer = await db.query.siteTransfers.findFirst({ where: eq(siteTransfers.siteId, siteId) });
  return reply.send({ transfer: transfer && !isExpired(transfer) ? serializeForSender(transfer) : null });
}

/** DELETE /sites/:siteId/transfer — cancel the site's pending transfer. */
export async function cancelSiteTransfer(request: FastifyRequest<{ Params: { siteId: string } }>, reply: FastifyReply) {
  const siteId = parseSiteId(request.params.siteId);
  if (!siteId) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }
  await db.delete(siteTransfers).where(eq(siteTransfers.siteId, siteId));
  return reply.send({ success: true });
}

// ---- Recipient ----------------------------------------------------------------

type RecipientLookup =
  | { ok: true; transfer: TransferRow; userId: string }
  | { ok: false; status: number; body: Record<string, unknown> };

/** "tay@example.org" → "t••@example.org": enough to recognise, not to register. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"•".repeat(Math.max(1, Math.min(local.length - 1, 3)))}@${domain ?? ""}`;
}

/**
 * The pending transfer, provided the signed-in user is the person it was sent
 * to. The id alone is not enough: it must be opened from an account that holds
 * the recipient's address — verified, where this instance can send the
 * verification email (otherwise anyone holding a leaked link could register
 * the address and accept).
 */
async function loadTransferForRecipient(request: FastifyRequest, transferId: string): Promise<RecipientLookup> {
  const userId = request.user?.id;
  if (!userId) {
    return { ok: false, status: 401, body: { error: "Sign in to view this transfer" } };
  }

  const transfer = await db.query.siteTransfers.findFirst({ where: eq(siteTransfers.id, transferId) });
  if (!transfer || isExpired(transfer)) {
    return { ok: false, status: 404, body: { error: "This transfer link is no longer valid" } };
  }

  const recipient = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true, emailVerified: true },
  });
  if (recipient?.email.toLowerCase() !== transfer.recipientEmail.toLowerCase()) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "This transfer was sent to a different email address",
        reason: "wrong_account",
        recipientEmailHint: maskEmail(transfer.recipientEmail),
      },
    };
  }
  if (IS_CLOUD && !recipient.emailVerified) {
    return {
      ok: false,
      status: 403,
      body: { error: "Verify your email address to accept this transfer", reason: "email_unverified" },
    };
  }

  return { ok: true, transfer, userId };
}

/** GET /site-transfers/:transferId — what the recipient is being offered. */
export async function getIncomingSiteTransfer(
  request: FastifyRequest<{ Params: { transferId: string } }>,
  reply: FastifyReply
) {
  try {
    const lookup = await loadTransferForRecipient(request, request.params.transferId);
    if (!lookup.ok) {
      return reply.status(lookup.status).send(lookup.body);
    }
    const { transfer } = lookup;

    const [site, sourceOrg, sender] = await Promise.all([
      db.query.sites.findFirst({ where: eq(sites.siteId, transfer.siteId), columns: { name: true, domain: true } }),
      db.query.organization.findFirst({
        where: eq(organization.id, transfer.sourceOrganizationId),
        columns: { name: true },
      }),
      transfer.createdBy
        ? db.query.user.findFirst({ where: eq(user.id, transfer.createdBy), columns: { email: true } })
        : undefined,
    ]);

    return reply.send({
      id: transfer.id,
      site: { siteId: transfer.siteId, name: site?.name ?? "", domain: site?.domain ?? "" },
      sourceOrganizationId: transfer.sourceOrganizationId,
      sourceOrganizationName: sourceOrg?.name ?? "",
      sentBy: sender?.email ?? null,
      expiresAt: utcIso(transfer.expiresAt),
    });
  } catch (error) {
    request.log.error({ err: error }, "Error loading site transfer");
    return reply.status(500).send({ error: "Failed to load the transfer" });
  }
}

/** POST /site-transfers/:transferId/accept — move the site into one of the recipient's organizations. */
export async function acceptSiteTransfer(
  request: FastifyRequest<{ Params: { transferId: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const parsed = acceptTransferSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "organizationId is required" });
  }
  const targetOrganizationId = parsed.data.organizationId;

  try {
    const lookup = await loadTransferForRecipient(request, request.params.transferId);
    if (!lookup.ok) {
      return reply.status(lookup.status).send(lookup.body);
    }
    const { transfer, userId } = lookup;

    // The same gate as creating a site in that organization.
    const membership = await getOrgMembership(userId, targetOrganizationId);
    if (!roleHasPermission(effectiveOrgRole(membership), "sites:create")) {
      return reply
        .status(403)
        .send({ error: "You must be an admin or owner of the organization you move the site into" });
    }
    if (targetOrganizationId === transfer.sourceOrganizationId) {
      return reply.status(400).send({ error: "The site is already in this organization" });
    }

    // Resolved before the transaction: it must not wait on a second connection.
    const siteLimit = await getPlanSiteLimit(targetOrganizationId);

    const outcome = await withOrganizationSiteLock(targetOrganizationId, async tx => {
      // Lock the site, then the transfer (the order every ownership change
      // uses): a concurrent accept, cancel, replacement or move waits here, and
      // afterwards finds the transfer gone or the site moved.
      await lockSiteOwnership(tx, transfer.siteId);
      const [current] = await tx
        .select()
        .from(siteTransfers)
        .where(eq(siteTransfers.id, transfer.id))
        .limit(1)
        .for("update");
      if (!current || isExpired(current)) {
        return { status: 404, error: "This transfer link is no longer valid" };
      }

      const limitError = await targetSiteLimitError(tx, targetOrganizationId, siteLimit);
      if (limitError) {
        return { status: 403, error: limitError };
      }

      // Moves only while the site is still in the organization the transfer
      // was sent from, and deletes the transfer.
      if (!(await applySiteMove(transfer.siteId, current.sourceOrganizationId, targetOrganizationId, tx))) {
        await tx.delete(siteTransfers).where(eq(siteTransfers.id, transfer.id));
        return { status: 409, error: "The site has moved since this transfer was sent" };
      }
      // The Search Console connection holds the sender's Google credentials;
      // it does not go to someone else's organization.
      await tx.delete(gscConnections).where(eq(gscConnections.siteId, transfer.siteId));
      return null;
    });

    if (outcome) {
      return reply.status(outcome.status).send({ error: outcome.error });
    }

    await invalidateSiteMoveAccess(transfer.sourceOrganizationId, targetOrganizationId);
    return reply.send({ success: true, siteId: transfer.siteId, organizationId: targetOrganizationId });
  } catch (error) {
    request.log.error({ err: error }, "Error accepting site transfer");
    return reply.status(500).send({ error: "Failed to accept the transfer" });
  }
}

/** POST /site-transfers/:transferId/decline — the recipient turns the transfer down. */
export async function declineSiteTransfer(
  request: FastifyRequest<{ Params: { transferId: string } }>,
  reply: FastifyReply
) {
  try {
    const lookup = await loadTransferForRecipient(request, request.params.transferId);
    if (!lookup.ok) {
      return reply.status(lookup.status).send(lookup.body);
    }
    await db.delete(siteTransfers).where(eq(siteTransfers.id, lookup.transfer.id));
    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Error declining site transfer");
    return reply.status(500).send({ error: "Failed to decline the transfer" });
  }
}
