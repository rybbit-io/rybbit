import { FastifyReply, FastifyRequest } from "fastify";
import { FilterParams } from "@rybbit/shared";
import { SessionReplayQueryService } from "../../services/replay/sessionReplayQueryService.js";

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
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      timeZone: request.query.timeZone,
      pastMinutesStart: request.query.pastMinutesStart ? Number(request.query.pastMinutesStart) : undefined,
      pastMinutesEnd: request.query.pastMinutesEnd ? Number(request.query.pastMinutesEnd) : undefined,
      filters: filters || "",
    });

    return reply.send({ data: replays });
  } catch (error) {
    console.error("Error fetching session replays:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
