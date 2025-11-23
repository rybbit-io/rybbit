import { FastifyReply, FastifyRequest } from "fastify";
import { SessionReplayQueryService } from "../../services/replay/sessionReplayQueryService.js";

export async function getSessionReplayEvents(
  request: FastifyRequest<{
    Params: { site: string; sessionId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = Number(request.params.site);
    const { sessionId } = request.params;

    const sessionReplayService = new SessionReplayQueryService();
    const replayData = await sessionReplayService.getSessionReplayEvents(siteId, sessionId);

    return reply.send(replayData);
  } catch (error) {
    console.error("Error fetching session replay events:", error);
    if (error instanceof Error && error.message === "Session replay not found") {
      return reply.status(404).send({ error: "Session replay not found" });
    }
    return reply.status(500).send({ error: "Internal server error" });
  }
}
