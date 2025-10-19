import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ingestEvents, listEvents } from "../../services/projects/eventService.js";
import { getEventDailySeries, getEventSummary } from "../../services/projects/eventStatsService.js";
import { validateProjectAndRequest, validateProjectContext, validateRequest } from "./utils/index.js";

export const eventSchema = z
  .object({
    timestamp: z.string().datetime(),
    page_url: z.string().url().max(2048).optional(),
    path: z.string().max(2048).optional(),
    referrer: z.string().max(2048).optional(),
    session_id: z.string().max(255).optional(),
    anon_id: z.string().max(255).optional(),
    user_id: z.string().max(255).optional(),
    funnel_id: z.string().max(64).optional(),
    step: z.string().max(64).optional(),
    metadata: z.record(z.any()).optional(),
    country: z.string().max(2).optional(),
    city: z.string().max(128).optional(),
    device: z.string().max(64).optional(),
    idempotency_key: z.string().max(128).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.session_id && !data.anon_id && !data.user_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "One of session_id, anon_id or user_id must be provided",
        path: ["session_id"],
      });
    }
  });

export const payloadSchema = z.union([eventSchema, z.array(eventSchema).min(1)]);
const querySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  page: z.coerce.number().min(1).max(1000).default(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const statsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function registerEventRoutes(server: FastifyInstance) {
  server.post("/", { config: { rateLimit: false } }, async (request, reply) => {
    if (!validateProjectContext(request, reply)) return;

    const parseResult = validateRequest(request.body, payloadSchema, reply);
    if (!parseResult) return;

    const events = Array.isArray(parseResult) ? parseResult : [parseResult];

    try {
      const result = await ingestEvents((request as any).project, events);
      request.log.info(
        { accepted: result.accepted, skipped: result.skipped, total: result.total },
        "Events ingested"
      );
      return reply.status(202).send({
        accepted: result.accepted,
        skipped: result.skipped,
        total: result.total,
      });
    } catch (error) {
      request.log.error(error, "Failed to ingest events");
      return reply.status(500).send({ error: "Failed to ingest events" });
    }
  });

  server.get("/", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, querySchema);
    if (!validated) return;

    const { project, data } = validated;
    const { limit, page, from, to } = data;

    const offset = ((page ?? 1) - 1) * (limit ?? 50);

    const rows = await listEvents(project.id, { limit: limit ?? 50, offset, from, to });

    return reply.send({
      data: rows.map(row => ({
        id: row.id,
        timestamp: row.occurredAt,
        page_url: row.pageUrl,
        path: row.path,
        referrer: row.referrer,
        funnel_id: row.funnelId,
        step: row.stepKey,
        metadata: row.metadata,
      })),
      pagination: {
        limit,
        page,
      },
    });
  });

  server.get("/stats/summary", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, statsQuerySchema);
    if (!validated) return;

    const { project, data } = validated;

    const summary = await getEventSummary(project.id, data);
    return reply.send({ data: summary });
  });

  server.get("/stats/daily", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, statsQuerySchema);
    if (!validated) return;

    const { project, data } = validated;

    const series = await getEventDailySeries(project.id, data);
    return reply.send({ data: series });
  });
}
