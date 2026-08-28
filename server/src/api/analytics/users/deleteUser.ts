import { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, or } from "drizzle-orm";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { db } from "../../../db/postgres/postgres.js";
import { userAliases, userProfiles } from "../../../db/postgres/schema.js";
import { replayPayloadStorage } from "../../../services/replay/replayPayloadStorage.js";

export interface DeleteUserRequest {
  Params: {
    siteId: string;
    userId: string;
  };
}

/**
 * GDPR erasure: permanently delete all analytics data for a user — events,
 * session replays (including R2-stored payloads), profile, and aliases.
 * Accepts either an identified user ID or an anonymous device fingerprint.
 *
 * Events a linked device produced while identified as a DIFFERENT user are
 * preserved (shared-device case): device-scoped deletion only applies to
 * unattributed events.
 */
export async function deleteUser(req: FastifyRequest<DeleteUserRequest>, res: FastifyReply) {
  const { userId } = req.params;
  const siteId = Number(req.params.siteId);

  try {
    // Devices linked to this user via identify() calls
    const aliases = await db
      .select({ anonymousId: userAliases.anonymousId })
      .from(userAliases)
      .where(and(eq(userAliases.siteId, siteId), eq(userAliases.userId, userId)));
    const deviceIds = [userId, ...aliases.map(a => a.anonymousId)];

    const userCondition = `site_id = {siteId:UInt16}
      AND (
        identified_user_id = {userId:String}
        OR (user_id IN ({deviceIds:Array(String)}) AND identified_user_id = '')
      )`;
    const queryParams = { siteId, userId, deviceIds };

    // Replay payload cleanup must finish before deleting its only object keys.
    // If object storage is unavailable, retain all replay rows for a safe retry.
    await replayPayloadStorage.deleteUserEvents(siteId, userId, deviceIds);

    await Promise.all(
      ["events", "session_replay_metadata_v2"].map(table =>
        clickhouse.command({
          query: `DELETE FROM ${table} WHERE ${userCondition}`,
          query_params: queryParams,
        })
      )
    );

    await Promise.all([
      db.delete(userProfiles).where(and(eq(userProfiles.siteId, siteId), eq(userProfiles.userId, userId))),
      db
        .delete(userAliases)
        .where(
          and(eq(userAliases.siteId, siteId), or(eq(userAliases.userId, userId), eq(userAliases.anonymousId, userId)))
        ),
    ]);

    return res.send({ success: true });
  } catch (error) {
    req.log.error({ err: error }, "Error deleting user");
    return res.status(500).send({ error: "Failed to delete user" });
  }
}
