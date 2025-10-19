import { FastifyInstance } from "fastify";
import { z } from "zod";
import { countUsers, listUsers } from "../../services/projects/userService.js";
import { validateProjectAndRequest } from "./utils/index.js";

const usersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  page: z.coerce.number().min(1).max(1000).default(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function registerUserRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    const validated = validateProjectAndRequest(request, reply, usersQuerySchema);
    if (!validated) return;

    const { project, data } = validated;
    const { limit, page, from, to } = data;
    const offset = ((page ?? 1) - 1) * (limit ?? 50);

    const [rows, total] = await Promise.all([
      listUsers(project.id, { limit: limit ?? 50, offset, from, to }),
      countUsers(project.id, { from, to }),
    ]);

    return reply.send({
      data: rows.map(row => ({
        visitor_id: row.visitorId,
        visits: row.visits,
        sessions: row.sessions,
        first_seen: row.firstSeen,
        last_seen: row.lastSeen,
      })),
      pagination: {
        limit,
        page,
        total,
      },
    });
  });
}
