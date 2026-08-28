import { FastifyReply, FastifyRequest } from "fastify";
import { stripe } from "../../lib/stripe.js";
import { getOrganizationBillingAccount } from "../../services/billing/organizationBilling.js";

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

  try {
    const billingAccount = await getOrganizationBillingAccount(userId, organizationId);
    if (!billingAccount.ok && billingAccount.reason === "not_owner") {
      return reply.status(403).send({ error: "Only organization owners can manage billing" });
    }
    if (!billingAccount.ok || !billingAccount.account.stripeCustomerId) {
      return reply.send([]);
    }

    const invoices = await stripe.invoices.list({
      customer: billingAccount.account.stripeCustomerId,
      limit: 100,
    });

    const formatted = invoices.data.map(invoice => ({
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
    request.log.error({ err: error }, "Get Invoices Error");
    return reply.status(500).send({
      error: "Failed to fetch invoices",
    });
  }
}
