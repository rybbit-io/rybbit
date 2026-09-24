import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { clickhouseQuery } from "../../db/clickhouse/clickhouse.js";
import { QUERY_USER_LIMITS } from "../../db/clickhouse/queryLimits.js";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import {
  MAX_CUSTOM_QUERY_LENGTH,
  normalizeCustomQuery,
  sanitizeClickhouseError,
  validateScopedQuery,
} from "./utils/customQueryValidation.js";

const requestBodySchema = z.object({
  query: z.string().trim().min(1).max(MAX_CUSTOM_QUERY_LENGTH),
  // When provided, scope scoped_events to this single site (the per-site Query
  // page). Omitted → query spans every site the caller can access in the org.
  siteId: z.number().int().positive().optional(),
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
  const accessibleSiteIds = userSites
    .filter(site => site.organizationId === request.params.organizationId)
    .map(site => site.siteId);

  if (accessibleSiteIds.length === 0) {
    return reply.status(403).send({ error: "No access to organization or no sites found" });
  }

  let siteIds = accessibleSiteIds;
  if (body.data.siteId !== undefined) {
    if (!accessibleSiteIds.includes(body.data.siteId)) {
      return reply.status(403).send({ error: "No access to the requested site" });
    }
    siteIds = [body.data.siteId];
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
    const result = await clickhouseQuery.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteIds,
        limit: QUERY_USER_LIMITS.maxResultRows,
      },
      // Execution limits (readonly, max_execution_time, max_memory_usage,
      // max_result_rows, …) come from the rybbit_query settings profile and are
      // pinned there with constraints; sending them here would be rejected.
    });

    const data = await result.json<Record<string, unknown>>();
    return reply.send({
      data,
      meta: {
        queryId: result.query_id,
        rowCount: data.length,
        maxExecutionTimeSeconds: QUERY_USER_LIMITS.maxExecutionTimeSeconds,
        maxRows: QUERY_USER_LIMITS.maxResultRows,
      },
    });
  } catch (error) {
    request.log.error(error, "Failed to run custom analytics query");
    return reply.status(400).send({ error: sanitizeClickhouseError(error) });
  }
}
