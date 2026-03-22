import { eq, and } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { organization, member } from "../../db/postgres/schema.js";
import { stripe } from "../../lib/stripe.js";

export async function getInvoices(
  request: FastifyRequest<{
    Querystring: {
      organizationId: string;
    };
  }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const { organizationId } = request.query;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!organizationId) {
    return reply.status(400).send({ error: "Organization ID is required" });
  }

  if (!stripe) {
    return reply.status(500).send({ error: "Stripe is not configured" });
  }

  // Verify user is a member of this organization
  const memberResult = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);

  if (!memberResult.length) {
    return reply.status(403).send({ error: "You do not have access to this organization" });
  }

  try {
    // Get the organization's Stripe customer ID
    const orgResult = await db
      .select({ stripeCustomerId: organization.stripeCustomerId })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    const org = orgResult[0];
    if (!org?.stripeCustomerId) {
      return reply.send([]);
    }

    const invoices = await stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: 100,
    });

    const formatted = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    }));

    return reply.send(formatted);
  } catch (error: any) {
    console.error("Get Invoices Error:", error);
    return reply.status(500).send({
      error: "Failed to fetch invoices",
    });
  }
}
