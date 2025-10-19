import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getOverviewStats, getPageStats, getRealtimeStats } from "../../services/projects/statsService.js";
import { validateProjectAndRequest, validateProjectContext } from "./utils/index.js";

const overviewQuerySchema = z.object({
  granularity: z.enum(["daily", "monthly", "yearly"]).default("daily"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const pagesQuerySchema = z.object({
  path: z.string().max(2048).optional(),
  page_url: z.string().max(2048).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function registerStatsRoutes(server: FastifyInstance) {
  server.get("/overview", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, overviewQuerySchema);
    if (!validated) return;

    const { project, data: params } = validated;

    const data = await getOverviewStats(project.id, {
      granularity: params.granularity ?? "daily",
      from: params.from,
      to: params.to,
    });

    return reply.send({ data });
  });

  server.get("/pages", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, pagesQuerySchema);
    if (!validated) return;

    const { project, data: params } = validated;

    const data = await getPageStats(project.id, {
      path: params.path,
      pageUrl: params.page_url,
      from: params.from,
      to: params.to,
    });

    return reply.send({ data });
  });

  server.get("/realtime", async (request, reply) => {
    if (!validateProjectContext(request, reply)) return;

    const data = await getRealtimeStats((request as any).project.id);
    return reply.send({ data });
  });
}
