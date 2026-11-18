import { and, eq, like } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import { db } from "../../db/postgres/postgres.js";
import { twoFactor, user, verification } from "../../db/postgres/schema.js";
import { TRUSTED_DEVICE_IDENTIFIER_PATTERN } from "../../lib/twoFactor.js";

export async function resetAdminUserTwoFactor(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
) {
  const { userId } = request.params;
  try {
    const target = await db.transaction(async tx => {
      const [updated] = await tx
        .update(user)
        .set({ twoFactorEnabled: false })
        .where(eq(user.id, userId))
        .returning({ id: user.id });
      if (!updated) return null;
      await tx.delete(twoFactor).where(eq(twoFactor.userId, userId));
      await tx
        .delete(verification)
        .where(and(like(verification.identifier, TRUSTED_DEVICE_IDENTIFIER_PATTERN), eq(verification.value, userId)));
      return updated;
    });
    if (!target) {
      return reply.status(404).send({ error: "User not found" });
    }
    request.log.info({ userId, adminId: request.user?.id }, "Admin reset two-factor authentication");
    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error, userId }, "Failed to reset two-factor authentication");
    return reply.status(500).send({ error: "Failed to reset two-factor authentication" });
  }
}
