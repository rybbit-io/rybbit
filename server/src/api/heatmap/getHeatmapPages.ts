import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickHeatmapService } from "../../services/heatmap/clickHeatmapService.js";

export interface GetHeatmapPagesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    limit?: string;
  }>;
}

export async function getHeatmapPages(req: FastifyRequest<GetHeatmapPagesRequest>, res: FastifyReply) {
  const { limit, ...filterParams } = req.query;
  const siteId = Number(req.params.siteId);

  try {
    const pages = await clickHeatmapService.getHeatmapPages(siteId, {
      ...filterParams,
      limit: limit ? Number(limit) : 100,
    });

    return res.send({
      data: pages,
    });
  } catch (error) {
    console.error("Error fetching heatmap pages:", error);
    return res.status(500).send({ error: "Failed to fetch heatmap pages" });
  }
}
