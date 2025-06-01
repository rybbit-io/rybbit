import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import SqlString from "sqlstring";

// Validation schema for URL parameters
const getSessionsParamsSchema = z.object({
  site: z.string().transform(Number),
});

// Validation schema for query parameters
const getSessionsQuerySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  user_id: z.string().optional(),
});

export async function getReplaySessions(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const params = getSessionsParamsSchema.parse(request.params);
    const query = getSessionsQuerySchema.parse(request.query);
    const { site: site_id } = params;
    const { page, limit, start_date, end_date, user_id } = query;

    const offset = (page - 1) * limit;

    // Build WHERE conditions with proper escaping
    let whereConditions = [`site_id = ${SqlString.escape(site_id)}`];

    if (start_date) {
      whereConditions.push(`start_time >= ${SqlString.escape(start_date)}`);
    }

    if (end_date) {
      whereConditions.push(`start_time <= ${SqlString.escape(end_date)}`);
    }

    if (user_id) {
      whereConditions.push(`user_id = ${SqlString.escape(user_id)}`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Get sessions with metadata
    const sessionsQuery = `
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
      WHERE ${whereClause}
      ORDER BY start_time DESC
      LIMIT ${SqlString.escape(limit)}
      OFFSET ${SqlString.escape(offset)}
    `;

    const sessions = await clickhouse.query({
      query: sessionsQuery,
      format: "JSONEachRow",
    });

    const sessionData = await sessions.json();

    // Get total count for pagination
    const countQuery = `
      SELECT count() as total
      FROM session_replay_metadata
      WHERE ${whereClause}
    `;

    const countResult = await clickhouse.query({
      query: countQuery,
      format: "JSONEachRow",
    });

    const countData = (await countResult.json()) as Array<{ total: number }>;
    const total = countData[0]?.total || 0;

    reply.status(200).send({
      sessions: sessionData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching replay sessions:", error);

    if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: "Invalid query parameters",
        details: error.errors,
      });
    } else {
      reply.status(500).send({
        error: "Internal server error",
      });
    }
  }
}
