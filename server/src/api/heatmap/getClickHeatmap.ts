import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { clickHeatmapService } from "../../services/heatmap/clickHeatmapService.js";

export interface GetClickHeatmapRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{
    pathname: string;
    viewportBreakpoint?: "mobile" | "tablet" | "desktop" | "all";
    gridResolution?: string;
  }>;
}

export async function getClickHeatmap(req: FastifyRequest<GetClickHeatmapRequest>, res: FastifyReply) {
  const { pathname, viewportBreakpoint, gridResolution, ...filterParams } = req.query;
  const siteId = Number(req.params.siteId);

  if (!pathname) {
    return res.status(400).send({ error: "pathname is required" });
  }

  try {
    const result = await clickHeatmapService.getClickHeatmap(siteId, pathname, {
      ...filterParams,
      viewportBreakpoint: viewportBreakpoint || "all",
      gridResolution: gridResolution ? Number(gridResolution) : 100,
    });

    return res.send({
      data: result,
      pathname,
    });
  } catch (error) {
    console.error("Error fetching click heatmap:", error);
    return res.status(500).send({ error: "Failed to fetch click heatmap data" });
  }
}
