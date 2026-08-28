import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { cancellationFeedback } from "../../db/postgres/schema.js";
import { getOrganizationBillingAccount } from "../../services/billing/organizationBilling.js";

interface CancellationFeedbackBody {
  organizationId: string;
  reason: string;
  reasonDetails?: string;
  retentionOfferShown?: string;
  retentionOfferAccepted?: boolean;
  outcome: string;
  planNameAtCancellation?: string;
  monthlyEventCountAtCancellation?: number;
}

export async function submitCancellationFeedback(
  request: FastifyRequest<{ Body: CancellationFeedbackBody }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const {
    organizationId,
    reason,
    reasonDetails,
    retentionOfferShown,
    retentionOfferAccepted,
    outcome,
    planNameAtCancellation,
    monthlyEventCountAtCancellation,
  } = request.body;

  if (!organizationId || !reason || !outcome) {
    return reply.status(400).send({
      error: "Missing required parameters: organizationId, reason, outcome",
    });
  }

  try {
    const billingAccount = await getOrganizationBillingAccount(userId, organizationId);
    if (!billingAccount.ok && billingAccount.reason === "not_owner") {
      return reply.status(403).send({
        error: "Only organization owners can submit cancellation feedback",
      });
    }
    if (!billingAccount.ok) {
      return reply.status(404).send({ error: "Organization not found" });
    }

    await db.insert(cancellationFeedback).values({
      organizationId,
      userId,
      reason,
      reasonDetails: reasonDetails ?? null,
      retentionOfferShown: retentionOfferShown ?? null,
      retentionOfferAccepted: retentionOfferAccepted ?? false,
      outcome,
      planNameAtCancellation: planNameAtCancellation ?? null,
      monthlyEventCountAtCancellation: monthlyEventCountAtCancellation ?? null,
    });

    return reply.send({ success: true });
  } catch (error: any) {
    request.log.error({ err: error }, "Cancellation Feedback Error");
    return reply.status(500).send({
      error: "Failed to submit cancellation feedback",
    });
  }
}
