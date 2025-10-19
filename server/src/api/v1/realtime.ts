import { FastifyInstance } from "fastify";
import { getRealtimeStats } from "../../services/projects/statsService.js";
import { validateProjectContext } from "./utils/index.js";

export async function registerRealtimeRoutes(server: FastifyInstance) {
  server.get("/visitors", async (request, reply) => {
    if (!validateProjectContext(request, reply)) return;

    reply.header("Content-Type", "text/event-stream");
    reply.header("Cache-Control", "no-cache");
    reply.header("Connection", "keep-alive");

    const stream = reply.raw;
    const project = (request as any).project;

    const sendUpdate = async () => {
      const data = await getRealtimeStats(project.id);
      stream.write(`event: update\n`);
      stream.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const interval = setInterval(sendUpdate, 5000);
    await sendUpdate();

    request.raw.on("close", () => {
      clearInterval(interval);
    });

    return reply;
  });
}
