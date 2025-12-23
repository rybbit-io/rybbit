import { FastifyReply, FastifyRequest } from "fastify";
import { SessionReplayQueryService } from "../../services/replay/sessionReplayQueryService.js";
import { enrichWithTraits } from "../analytics/utils/utils.js";

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

    // The metadata from ClickHouse uses snake_case
    const metadata = replayData.metadata as any;

    // Enrich metadata with user traits
    const metadataWithIdentification = {
      ...metadata,
      identified_user_id: metadata.identified_user_id || "",
    };
    const [enrichedMetadata] = await enrichWithTraits([metadataWithIdentification], siteId);

    return reply.send({
      ...replayData,
      metadata: enrichedMetadata,
    });
  } catch (error) {
    console.error("Error fetching session replay events:", error);
    if (error instanceof Error && error.message === "Session replay not found") {
      return reply.status(404).send({ error: "Session replay not found" });
    }
    return reply.status(500).send({ error: "Internal server error" });
  }
}
