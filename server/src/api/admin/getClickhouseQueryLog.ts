import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";

interface QueryLogRow {
  event_time: string;
  query_id: string;
  query_kind: string;
  query_duration_ms: string;
  read_rows: string;
  read_bytes: string;
  written_rows: string;
  written_bytes: string;
  memory_usage: string;
  type: string;
  exception_code: string;
  query: string;
  user: string;
  databases: string[];
  tables: string[];
}

interface CountRow {
  total: string;
}

export async function getClickhouseQueryLog(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      pageSize?: string;
      sortBy?: string;
      sortOrder?: string;
      queryKind?: string;
      type?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "25", 10)));
    const sortBy = request.query.sortBy || "event_time";
    const sortOrder = request.query.sortOrder === "asc" ? "ASC" : "DESC";
    const queryKind = request.query.queryKind;
    const type = request.query.type;

    // Whitelist sortable columns to prevent injection
    const allowedSortColumns: Record<string, string> = {
      event_time: "event_time",
      query_duration_ms: "query_duration_ms",
      read_rows: "read_rows",
      read_bytes: "read_bytes",
      written_rows: "written_rows",
      written_bytes: "written_bytes",
      memory_usage: "memory_usage",
      type: "type",
      query_kind: "query_kind",
    };
    const sortColumn = allowedSortColumns[sortBy] || "event_time";

    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const conditions = [
      "event_time >= now() - INTERVAL 24 HOUR",
      "type != 'QueryStart'",
      "query NOT LIKE '%system.query_log%'",
      "query NOT LIKE '%system.processes%'",
    ];
    if (queryKind && ["Select", "Insert", "Other"].includes(queryKind)) {
      conditions.push(`query_kind = '${queryKind}'`);
    }
    if (type && ["QueryFinish", "ExceptionWhileProcessing"].includes(type)) {
      conditions.push(`type = '${type}'`);
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countResult = await clickhouse.query({
      query: `
        SELECT count() as total
        FROM system.query_log
        WHERE ${whereClause}
      `,
      format: "JSONEachRow",
    });
    const countRows = (await countResult.json()) as CountRow[];
    const total = Number(countRows[0]?.total || 0);

    // Get paginated results
    const queryResult = await clickhouse.query({
      query: `
        SELECT
          event_time,
          query_id,
          query_kind,
          query_duration_ms,
          read_rows,
          read_bytes,
          written_rows,
          written_bytes,
          memory_usage,
          type,
          exception_code,
          substring(query, 1, 500) as query,
          user,
          databases,
          tables
        FROM system.query_log
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ${pageSize}
        OFFSET ${offset}
      `,
      format: "JSONEachRow",
    });
    const rows = (await queryResult.json()) as QueryLogRow[];

    return reply.status(200).send({
      items: rows.map((row) => ({
        eventTime: row.event_time,
        queryId: row.query_id,
        queryKind: row.query_kind,
        queryDurationMs: Number(row.query_duration_ms),
        readRows: Number(row.read_rows),
        readBytes: Number(row.read_bytes),
        writtenRows: Number(row.written_rows),
        writtenBytes: Number(row.written_bytes),
        memoryUsage: Number(row.memory_usage),
        type: row.type,
        exceptionCode: Number(row.exception_code),
        query: row.query,
        user: row.user,
        databases: row.databases,
        tables: row.tables,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    if (
      error?.message?.includes("query_log") ||
      error?.message?.includes("UNKNOWN_TABLE")
    ) {
      return reply.status(200).send({
        items: [],
        total: 0,
        page: 1,
        pageSize: 25,
        unavailable: true,
      });
    }
    request.log.error(error, "Failed to get ClickHouse query log");
    return reply.status(500).send({ error: "Failed to get ClickHouse query log" });
  }
}
