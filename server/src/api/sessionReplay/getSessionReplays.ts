import { FastifyReply, FastifyRequest } from "fastify";
import { FilterParams } from "@rybbit/shared";
import { SessionReplayQueryService } from "../../services/replay/sessionReplayQueryService.js";
import { enrichWithTraits } from "../analytics/utils/utils.js";

export async function getSessionReplays(
  request: FastifyRequest<{
    Params: { site: string };
    Querystring: FilterParams<{
      limit?: string;
      offset?: string;
      userId?: string;
      minDuration?: string;
    }>;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = Number(request.params.site);
    const { limit, offset, userId, minDuration, filters } = request.query;

    const sessionReplayService = new SessionReplayQueryService();
    const replays = await sessionReplayService.getSessionReplayList(siteId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
      userId: userId || undefined,
      minDuration: minDuration ? Number(minDuration) : undefined,
      start_date: request.query.start_date,
      end_date: request.query.end_date,
      time_zone: request.query.time_zone,
      past_minutes_start: request.query.past_minutes_start ? Number(request.query.past_minutes_start) : undefined,
      past_minutes_end: request.query.past_minutes_end ? Number(request.query.past_minutes_end) : undefined,
      filters: filters || "",
    });

    // The replays from ClickHouse use snake_case and enrichWithTraits expects that format
    const replaysWithTraits = await enrichWithTraits(
      replays as unknown as Array<{ identified_user_id: string }>,
      siteId
    );

    return reply.send({ data: replaysWithTraits });
  } catch (error) {
    console.error("Error fetching session replays:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
