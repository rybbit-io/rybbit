import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { FunnelRecord } from "../../services/projects/funnelService.js";
import {
  createFunnel,
  deleteFunnel,
  FunnelInput,
  getFunnel,
  getFunnelStats,
  listFunnels,
  updateFunnel,
} from "../../services/projects/funnelService.js";
import {
  validateProjectAndRequest,
  validateProjectContext,
  mapFunnelToResponse,
  normalizeStepInput,
  buildPartialUpdate,
} from "./utils/index.js";

const stepSchema = z.preprocess(
  (data: any) => {
    // Normalize camelCase pagePattern to snake_case page_pattern
    if (data && typeof data === 'object') {
      if (data.pagePattern && !data.page_pattern) {
        return { ...data, page_pattern: data.pagePattern };
      }
    }
    return data;
  },
  z.object({
    key: z.string().min(1).max(64),
    name: z.string().min(1).max(128),
    order: z.number().int().nonnegative().optional(),
    page_pattern: z.string().max(2048).optional(),
    pagePattern: z.string().max(2048).optional(), // Accept but will be normalized by preprocess
  })
);

const funnelSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  is_active: z.boolean().optional(),
  steps: z.array(stepSchema).min(1),
});

const updateSchema = funnelSchema.partial().extend({
  steps: z.array(stepSchema).min(1).optional(),
});

const statsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

type IdParams = {
  id: string;
};

// Mapping functions moved to utils/mappers.ts for reuse

export async function registerFunnelRoutes(server: FastifyInstance) {
  server.post("/", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, funnelSchema, "body");
    if (!validated) return;

    const { project, data } = validated;

    const input: FunnelInput = {
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      steps: normalizeStepInput(data.steps),
    };

    try {
      const funnel = await createFunnel(project.id, input);
      return reply.status(201).send({ data: mapFunnelToResponse(funnel) });
    } catch (error) {
      request.log.error(error, "Failed to create funnel");
      return reply.status(500).send({ error: "Failed to create funnel" });
    }
  });

  server.get("/", async (request, reply) => {
    if (!validateProjectContext(request, reply)) return;

    const funnels = await listFunnels((request as any).project.id);
    return reply.send({
      data: funnels.map(mapFunnelToResponse),
    });
  });

  server.get<{ Params: IdParams }>("/:id", async (request, reply) => {
    if (!validateProjectContext(request, reply)) return;

    const funnel = await getFunnel((request as any).project.id, request.params.id);
    if (!funnel) {
      return reply.status(404).send({ error: "Funnel not found" });
    }
    return reply.send({ data: mapFunnelToResponse(funnel) });
  });

  server.patch<{ Params: IdParams }>("/:id", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, updateSchema, "body");
    if (!validated) return;

    const { project, data } = validated;

    const input: Partial<FunnelInput> = {
      ...buildPartialUpdate(data, {
        name: "name",
        description: "description",
        is_active: "isActive",
      }),
      ...(data.steps && { steps: normalizeStepInput(data.steps) }),
    };

    const funnel = await updateFunnel(project.id, request.params.id, input);
    if (!funnel) {
      return reply.status(404).send({ error: "Funnel not found" });
    }
    return reply.send({ data: mapFunnelToResponse(funnel) });
  });

  server.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
    if (!validateProjectContext(request, reply)) return;

    const success = await deleteFunnel((request as any).project.id, request.params.id);
    if (!success) {
      return reply.status(404).send({ error: "Funnel not found" });
    }
    return reply.status(204).send();
  });

  server.get<{ Params: IdParams }>("/:id/stats", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, statsQuerySchema);
    if (!validated) return;

    const { project, data } = validated;

    const stats = await getFunnelStats(project.id, request.params.id, data);
    if (!stats) {
      return reply.status(404).send({ error: "Funnel not found" });
    }

    return reply.send({ data: stats });
  });
}
