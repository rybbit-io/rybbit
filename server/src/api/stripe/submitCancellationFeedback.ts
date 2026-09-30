import { roleHasPermission } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { cancellationFeedback } from "../../db/postgres/schema.js";
import { getOrgMembership } from "../../lib/access.js";
import { z } from "zod";

const feedbackSchema = z.object({
  organizationId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(255),
  reasonDetails: z.string().max(5000).optional(),
  retentionOfferShown: z.string().max(255).optional(),
  retentionOfferAccepted: z.boolean().optional(),
  outcome: z.string().trim().min(1).max(255),
  planNameAtCancellation: z.string().max(255).optional(),
  monthlyEventCountAtCancellation: z.number().int().nonnegative().optional(),
});

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

  const parsed = feedbackSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply
      .status(400)
      .send({ error: "Missing required parameters: organizationId, reason, outcome, or invalid feedback" });
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
  } = parsed.data;

  try {
    // Verify user has permission (owner only)
    const membership = await getOrgMembership(userId, organizationId);

    if (!roleHasPermission(membership?.role, "billing:manage")) {
      return reply.status(403).send({
        error: "Only organization owners can submit cancellation feedback",
      });
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
