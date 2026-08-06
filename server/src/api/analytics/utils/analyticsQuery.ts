import { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils.js";

/**
 * A fully-built ClickHouse query plus its bound parameters. Handlers build
 * specs with pure functions (testable without Fastify or a live database);
 * only the executor below ever talks to ClickHouse.
 */
export interface QuerySpec {
  query: string;
  params?: Record<string, unknown>;
}

/** Carries the failed SQL so the route wrapper can log it alongside the cause. */
export class AnalyticsQueryError extends Error {
  constructor(
    readonly original: unknown,
    readonly queries: string[]
  ) {
    super("ClickHouse query failed");
    this.name = "AnalyticsQueryError";
  }
}

export async function runAnalyticsQuery<T>(spec: QuerySpec): Promise<T[]> {
  try {
    const result = await clickhouse.query({
      query: spec.query,
      format: "JSONEachRow",
      query_params: spec.params,
    });
    return await processResults<T>(result);
  } catch (error) {
    throw new AnalyticsQueryError(error, [spec.query]);
  }
}

export async function runPaginatedQuery<T>(
  dataSpec: QuerySpec,
  countSpec: QuerySpec
): Promise<{ data: T[]; totalCount: number }> {
  const [data, countRows] = await Promise.all([
    runAnalyticsQuery<T>(dataSpec),
    runAnalyticsQuery<{ totalCount: number }>(countSpec),
  ]);
  return { data, totalCount: countRows[0]?.totalCount ?? 0 };
}

/**
 * LIMIT/OFFSET clauses from untrusted `limit`/`page` query params.
 * Count queries get no clauses; invalid or missing values fall back to
 * `defaultLimit`; page 1 (offset 0) emits no OFFSET clause.
 */
export function getPaginationStatements(
  { limit, page }: { limit?: number | string; page?: number | string },
  defaultLimit: number,
  isCountQuery = false
): { limitStatement: string; offsetStatement: string } {
  if (isCountQuery) {
    return { limitStatement: "", offsetStatement: "" };
  }

  let validatedLimit: number | null = null;
  if (limit !== undefined) {
    const parsedLimit = parseInt(String(limit), 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      validatedLimit = parsedLimit;
    }
  }
  const limitStatement = `LIMIT ${validatedLimit ?? defaultLimit}`;

  let offsetStatement = "";
  if (page !== undefined) {
    const parsedPage = parseInt(String(page), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      const offset = (parsedPage - 1) * (validatedLimit ?? defaultLimit);
      if (offset > 0) {
        offsetStatement = `OFFSET ${offset}`;
      }
    }
  }

  return { limitStatement, offsetStatement };
}

type AnalyticsHandler<R extends RouteGenericInterface> = (
  req: FastifyRequest<R>,
  res: FastifyReply
) => Promise<unknown>;

/**
 * Wraps a handler with the standard analytics error policy: failures log the
 * label (and the failed SQL when available) and respond 500 with
 * `Failed to fetch <label>`. The label may derive from the request.
 */
export function analyticsRoute<R extends RouteGenericInterface>(
  errorLabel: string | ((req: FastifyRequest<R>) => string),
  handler: AnalyticsHandler<R>
): AnalyticsHandler<R> {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      const label = typeof errorLabel === "function" ? errorLabel(req) : errorLabel;
      if (error instanceof AnalyticsQueryError) {
        req.log.error({ err: error.original, label }, "Analytics query failed");
        for (const query of error.queries) {
          req.log.debug({ query }, "Failed analytics query");
        }
      } else {
        req.log.error({ err: error, label }, "Analytics query failed");
      }
      return res.status(500).send({ error: `Failed to fetch ${label}` });
    }
  };
}
