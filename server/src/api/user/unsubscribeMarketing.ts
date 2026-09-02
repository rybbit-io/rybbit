import { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../../db/postgres/postgres.js";
import { user } from "../../db/postgres/schema.js";
import { cancelScheduledEmail, unsubscribeContact } from "../../lib/email/email.js";
import { verifyExpiringPayload } from "../../lib/signedToken.js";

// Cancel tip emails pre-scheduled in Resend for users who signed up before the
// lifecycle email system replaced the fixed drip. Remove once those have aged out.
const cancelLegacyScheduledTips = async (emailIds: string[]): Promise<void> => {
  for (const emailId of emailIds) {
    await cancelScheduledEmail(emailId);
  }
};

// Authenticated user unsubscribe
export const unsubscribeMarketing = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    // Get user data
    const [userData] = await db
      .select({
        email: user.email,
        scheduledTipEmailIds: user.scheduledTipEmailIds,
      })
      .from(user)
      .where(eq(user.id, userId));

    if (!userData) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Cancel scheduled tip emails
    const emailIds = (userData.scheduledTipEmailIds as string[]) || [];
    await cancelLegacyScheduledTips(emailIds);

    // Clear the scheduled email IDs
    await db
      .update(user)
      .set({
        scheduledTipEmailIds: [],
        updatedAt: DateTime.now().toISO(),
      })
      .where(eq(user.id, userId));

    // Mark contact as unsubscribed in Resend
    await unsubscribeContact(userData.email);

    return reply.send({ success: true, message: "Successfully unsubscribed from marketing emails" });
  } catch (error) {
    request.log.error({ err: error }, "Error unsubscribing from marketing emails");
    return reply.status(500).send({ error: "Failed to unsubscribe" });
  }
};

// One-click unsubscribe handler
// GET: User clicks link in email - show confirmation page
// POST: Email client's List-Unsubscribe-Post - return 200 OK
// Unsigned links are honored only until this date: emails sent before link
// signing existed (2026-09) carry no signature, and unsubscribe links must
// keep working for a while. After the cutoff every link must carry a valid
// signed (email, exp) pair, closing the unsubscribe-anyone hole for good.
const LEGACY_UNSIGNED_CUTOFF = DateTime.fromISO("2026-12-01T00:00:00Z");

export const oneClickUnsubscribeMarketing = async (
  request: FastifyRequest<{ Querystring: { email?: string; exp?: string; sig?: string } }>,
  reply: FastifyReply
) => {
  try {
    const email = request.query.email;
    const { exp, sig } = request.query;
    const isGetRequest = request.method === "GET";

    if (email) {
      const validSignature = !!(sig && exp) && verifyExpiringPayload(`unsubscribe:${email}`, exp, sig);
      const legacyWindowOpen = DateTime.utc() < LEGACY_UNSIGNED_CUTOFF;
      const acceptableLegacy = !sig && !exp && legacyWindowOpen;
      if (!validSignature && !acceptableLegacy) {
        return reply.status(400).send({ error: "Invalid or expired unsubscribe link" });
      }
    }

    if (!email) {
      if (isGetRequest) {
        return reply.status(400).type("text/html").send(`
          <!DOCTYPE html>
          <html><head><title>Unsubscribe - Rybbit</title></head>
          <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
            <h1>Invalid Request</h1>
            <p>Email address is required to unsubscribe.</p>
          </body></html>
        `);
      }
      return reply.status(400).send({ error: "Email is required" });
    }

    // Find user by email
    const [userData] = await db
      .select({
        id: user.id,
        scheduledTipEmailIds: user.scheduledTipEmailIds,
      })
      .from(user)
      .where(eq(user.email, email));

    if (userData) {
      // Cancel scheduled tip emails
      const emailIds = (userData.scheduledTipEmailIds as string[]) || [];
      await cancelLegacyScheduledTips(emailIds);

      // Clear the scheduled email IDs
      await db
        .update(user)
        .set({
          scheduledTipEmailIds: [],
          updatedAt: DateTime.now().toISO(),
        })
        .where(eq(user.id, userData.id));
    }

    // Mark contact as unsubscribed in Resend (even if user not found in our DB)
    await unsubscribeContact(email);

    // For GET requests (link clicks), show confirmation page
    if (isGetRequest) {
      return reply.status(200).type("text/html").send(`
        <!DOCTYPE html>
        <html><head><title>Unsubscribed - Rybbit</title></head>
        <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
          <h1>Unsubscribed</h1>
          <p>You have been successfully unsubscribed from Rybbit marketing emails.</p>
          <p style="color: #666; margin-top: 20px;">You can close this page.</p>
        </body></html>
      `);
    }

    // For POST requests (email client List-Unsubscribe), return 200 OK as per RFC 8058
    return reply.status(200).send();
  } catch (error) {
    request.log.error({ err: error }, "Error in one-click unsubscribe");
    // Still return 200 to not confuse email clients
    return reply.status(200).send();
  }
};
