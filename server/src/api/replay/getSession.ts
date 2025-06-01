import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import SqlString from "sqlstring";

// Validation schema for route parameters
const getSessionSchema = z.object({
  site_id: z.string().transform(Number),
  session_id: z.string().uuid(),
});

export async function getReplaySession(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const params = getSessionSchema.parse(request.params);
    const { site_id, session_id } = params;

    // Get session metadata
    const metadataQuery = `
      SELECT
        session_id,
        user_id,
        start_time,
        end_time,
        duration_ms,
        event_count,
        compressed_size_bytes,
        page_url,
        user_agent,
        created_at
      FROM session_replay_metadata
      WHERE site_id = ${SqlString.escape(site_id)} AND session_id = ${SqlString.escape(session_id)}
      LIMIT 1
    `;

    const metadataResult = await clickhouse.query({
      query: metadataQuery,
      format: "JSONEachRow",
    });

    const metadataData = (await metadataResult.json()) as Array<{
      session_id: string;
      user_id: string;
      start_time: string;
      end_time: string | null;
      duration_ms: number | null;
      event_count: number;
      compressed_size_bytes: number;
      page_url: string;
      user_agent: string;
      created_at: string;
    }>;

    if (metadataData.length === 0) {
      reply.status(404).send({
        error: "Session not found",
      });
      return;
    }

    const metadata = metadataData[0];

    // Get session events
    const eventsQuery = `
      SELECT
        event_type,
        event_data,
        sequence_number,
        timestamp
      FROM session_replay_events
      WHERE site_id = ${SqlString.escape(site_id)} AND session_id = ${SqlString.escape(session_id)}
      ORDER BY sequence_number ASC
    `;

    const eventsResult = await clickhouse.query({
      query: eventsQuery,
      format: "JSONEachRow",
    });

    const eventsData = (await eventsResult.json()) as Array<{
      event_type: string;
      event_data: string;
      sequence_number: number;
      timestamp: string;
    }>;

    // Parse event data and reconstruct the events array
    const events = eventsData
      .map((row) => {
        try {
          return JSON.parse(row.event_data);
        } catch (e) {
          console.error("Error parsing event data:", e);
          return null;
        }
      })
      .filter(Boolean);

    reply.status(200).send({
      metadata,
      events,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error("Error fetching replay session:", error);

    if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: "Invalid parameters",
        details: error.errors,
      });
    } else {
      reply.status(500).send({
        error: "Internal server error",
      });
    }
  }
}
