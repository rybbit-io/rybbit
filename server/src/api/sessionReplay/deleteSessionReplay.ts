import { FastifyReply, FastifyRequest } from "fastify";
import { SessionReplayQueryService } from "../../services/replay/sessionReplayQueryService.js";

export async function deleteSessionReplay(
  request: FastifyRequest<{
    Params: {
      sessionId: string;
      siteId: string;
    };
  }>,
  reply: FastifyReply
) {
  const { sessionId, siteId } = request.params;

  try {
    const numericSiteId = parseInt(siteId);
    if (isNaN(numericSiteId)) {
      return reply.status(400).send({ error: "Invalid site ID" });
    }

    const sessionReplayQueryService = new SessionReplayQueryService();
    const metadata = await sessionReplayQueryService.getSessionReplayMetadata(numericSiteId, sessionId);

    if (!metadata) {
      return reply.status(404).send({ error: "Session replay not found" });
    }

    // Delete the session replay
    await sessionReplayQueryService.deleteSessionReplay(numericSiteId, sessionId);

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error("Error deleting session replay:", error);
    return reply.status(500).send({ error: "Failed to delete session replay" });
  }
}
