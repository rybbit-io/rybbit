import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { MAX_CUSTOM_QUERY_LENGTH, normalizeCustomQuery, validateScopedQuery } from "./utils/customQueryValidation.js";

const MAX_EXECUTION_TIME_SECONDS = 10;
const MAX_RESULT_ROWS = 1000;

const requestBodySchema = z.object({
  query: z.string().trim().min(1).max(MAX_CUSTOM_QUERY_LENGTH),
});

export async function runCustomQuery(
  request: FastifyRequest<{
    Params: {
      organizationId: string;
    };
    Body: unknown;
  }>,
  reply: FastifyReply
) {
  const body = requestBodySchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({ error: body.error.errors[0]?.message ?? "Invalid request body" });
  }

  const validationError = validateScopedQuery(body.data.query);
  if (validationError) {
    return reply.status(400).send({ error: validationError });
  }

  const userSites = await getSitesUserHasAccessTo(request);
  const siteIds = userSites
    .filter(site => site.organizationId === request.params.organizationId)
    .map(site => site.siteId);

  if (siteIds.length === 0) {
    return reply.status(403).send({ error: "No access to organization or no sites found" });
  }

  const query = `
    WITH scoped_events AS (
      SELECT *
      FROM events
      PREWHERE site_id IN {siteIds:Array(UInt16)}
    )
    SELECT *
    FROM (
      ${normalizeCustomQuery(body.data.query)}
    )
    LIMIT {limit:UInt32}
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteIds,
        limit: MAX_RESULT_ROWS,
      },
      clickhouse_settings: {
        max_execution_time: MAX_EXECUTION_TIME_SECONDS,
        max_result_rows: String(MAX_RESULT_ROWS),
        result_overflow_mode: "break",
        readonly: "2",
      },
    });

    const data = await result.json<Record<string, unknown>>();
    return reply.send({
      data,
      meta: {
        queryId: result.query_id,
        rowCount: data.length,
        maxExecutionTimeSeconds: MAX_EXECUTION_TIME_SECONDS,
        maxRows: MAX_RESULT_ROWS,
      },
    });
  } catch (error) {
    request.log.error(error, "Failed to run custom analytics query");
    const message = error instanceof Error && error.message ? error.message : "Failed to run query";
    return reply.status(400).send({ error: message });
  }
}
