import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { user } from "../../db/postgres/schema.js";
import { verifyExpiringPayload } from "../../lib/signedToken.js";

const page = (title: string, heading: string, body: string) => `
  <!DOCTYPE html>
  <html><head><title>${title} - Rybbit</title></head>
  <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
    <h1>${heading}</h1>
    <p>${body}</p>
  </body></html>
`;

/**
 * One-click "Turn off weekly reports" from the report email, without logging in.
 * GET: the footer link, answered with a confirmation page.
 * POST: an email client's List-Unsubscribe-Post (RFC 8058), answered with 200.
 * The link carries a signed (userId, exp) pair from weeklyReportUnsubscribeUrl.
 * It can be turned back on under Account settings.
 */
export const oneClickUnsubscribeReports = async (
  request: FastifyRequest<{ Querystring: { userId?: string; exp?: string; sig?: string } }>,
  reply: FastifyReply
) => {
  const isGetRequest = request.method === "GET";
  const { userId, exp, sig } = request.query;

  if (!userId || !exp || !sig || !verifyExpiringPayload(`unsubscribe-reports:${userId}`, exp, sig)) {
    if (isGetRequest) {
      return reply
        .status(400)
        .type("text/html")
        .send(
          page(
            "Weekly reports",
            "Invalid link",
            "This link is invalid or has expired. You can turn off weekly reports in your account settings."
          )
        );
    }
    return reply.status(400).send({ error: "Invalid or expired unsubscribe link" });
  }

  try {
    await db.update(user).set({ sendAutoEmailReports: false }).where(eq(user.id, userId));
  } catch (error) {
    request.log.error({ err: error }, "Error turning off weekly reports");
    if (isGetRequest) {
      return reply
        .status(500)
        .type("text/html")
        .send(
          page(
            "Weekly reports",
            "Something went wrong",
            "We couldn't turn off your weekly reports just now. Please try the link again in a few minutes."
          )
        );
    }
    return reply.status(500).send({ error: "Failed to unsubscribe" });
  }

  if (isGetRequest) {
    return reply
      .status(200)
      .type("text/html")
      .send(
        page(
          "Weekly reports",
          "Weekly reports turned off",
          "You won't get weekly reports anymore. You can turn them back on in your account settings."
        )
      );
  }
  return reply.status(200).send();
};
