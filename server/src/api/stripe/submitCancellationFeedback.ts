import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { cancellationFeedback, member } from "../../db/postgres/schema.js";
import { eq, and } from "drizzle-orm";

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
    // Verify user has permission (owner only)
    const memberResult = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1);

    if (!memberResult.length || memberResult[0].role !== "owner") {
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
    console.error("Cancellation Feedback Error:", error);
    return reply.status(500).send({
      error: "Failed to submit cancellation feedback",
    });
  }
}
