import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";

interface TableStatsRow {
  table: string;
  total_rows: string;
  compressed_size: string;
  compressed_bytes: string;
  uncompressed_size: string;
  uncompressed_bytes: string;
  parts_count: string;
}

interface RowsByDateRow {
  date: string;
  table: string;
  rows_inserted: string;
}

interface InsertRateRow {
  hour: string;
  insert_count: string;
  total_rows_inserted: string;
}

interface QueryErrorRow {
  event_time: string;
  query_id: string;
  exception_code: number;
  exception: string;
  query: string;
}

export async function getClickhouseStats(request: FastifyRequest<{ Querystring: { days?: string } }>, reply: FastifyReply) {
  const unavailableFeatures: string[] = [];
  const days = request.query.days ? parseInt(request.query.days, 10) : 30;
  const daysInterval = days > 0 ? days : 30;

  try {
    // Get table statistics (uses system.parts - always available)
    const tableStatsResult = await clickhouse.query({
      query: `
        SELECT
          table,
          sum(rows) as total_rows,
          formatReadableSize(sum(data_compressed_bytes)) as compressed_size,
          sum(data_compressed_bytes) as compressed_bytes,
          formatReadableSize(sum(data_uncompressed_bytes)) as uncompressed_size,
          sum(data_uncompressed_bytes) as uncompressed_bytes,
          count() as parts_count
        FROM system.parts
        WHERE database = currentDatabase() AND active = 1
          AND table IN ('events', 'session_replay_events', 'session_replay_metadata', 'monitor_events')
        GROUP BY table
        ORDER BY total_rows DESC
      `,
      format: "JSONEachRow",
    });
    const tableStats = (await tableStatsResult.json()) as TableStatsRow[];

    // Get rows by date - query actual tables for accurate daily counts
    const dateFilter = days === 0
      ? ""
      : `WHERE timestamp >= now() - INTERVAL ${daysInterval} DAY`;
    const dateFilterStartTime = days === 0
      ? ""
      : `WHERE start_time >= now() - INTERVAL ${daysInterval} DAY`;
    const rowsByDateResult = await clickhouse.query({
      query: `
        SELECT date, table, rows_inserted FROM (
          SELECT toDate(timestamp) as date, 'events' as table, count() as rows_inserted
          FROM events
          ${dateFilter}
          GROUP BY date
          UNION ALL
          SELECT toDate(timestamp) as date, 'session_replay_events' as table, count() as rows_inserted
          FROM session_replay_events
          ${dateFilter}
          GROUP BY date
          UNION ALL
          SELECT toDate(start_time) as date, 'session_replay_metadata' as table, count() as rows_inserted
          FROM session_replay_metadata
          ${dateFilterStartTime}
          GROUP BY date
        )
        ORDER BY date, table
      `,
      format: "JSONEachRow",
    });
    const rowsByDate = (await rowsByDateResult.json()) as RowsByDateRow[];

    // Get insert rate (last 24 hours) - uses system.query_log which may be disabled
    let insertRate: InsertRateRow[] = [];
    try {
      const insertRateResult = await clickhouse.query({
        query: `
          SELECT
            toStartOfHour(event_time) as hour,
            count() as insert_count,
            sum(written_rows) as total_rows_inserted
          FROM system.query_log
          WHERE type = 'QueryFinish'
            AND query_kind = 'Insert'
            AND event_time >= now() - INTERVAL 24 HOUR
          GROUP BY hour
          ORDER BY hour
        `,
        format: "JSONEachRow",
      });
      insertRate = (await insertRateResult.json()) as InsertRateRow[];
    } catch (error: any) {
      // system.query_log may be disabled to save disk space
      request.log.debug("system.query_log not available - insert rate feature disabled");
      unavailableFeatures.push("insertRate");
    }

    // Get query errors (last 24 hours) - uses system.query_log which may be disabled
    let queryErrors: QueryErrorRow[] = [];
    try {
      const queryErrorsResult = await clickhouse.query({
        query: `
          SELECT
            event_time,
            query_id,
            exception_code,
            exception,
            substring(query, 1, 500) as query
          FROM system.query_log
          WHERE type = 'ExceptionWhileProcessing'
            AND event_time >= now() - INTERVAL 24 HOUR
          ORDER BY event_time DESC
          LIMIT 50
        `,
        format: "JSONEachRow",
      });
      queryErrors = (await queryErrorsResult.json()) as QueryErrorRow[];
    } catch (error: any) {
      // system.query_log may be disabled to save disk space
      request.log.debug("system.query_log not available - query errors feature disabled");
      if (!unavailableFeatures.includes("insertRate")) {
        unavailableFeatures.push("queryErrors");
      }
    }

    return reply.status(200).send({
      tableStats: tableStats.map(row => ({
        table: row.table,
        totalRows: Number(row.total_rows),
        compressedSize: row.compressed_size,
        compressedBytes: Number(row.compressed_bytes),
        uncompressedSize: row.uncompressed_size,
        uncompressedBytes: Number(row.uncompressed_bytes),
        partsCount: Number(row.parts_count),
      })),
      rowsByDate: rowsByDate.map(row => ({
        date: row.date,
        table: row.table,
        rowsInserted: Number(row.rows_inserted),
      })),
      insertRate: insertRate.map(row => ({
        hour: row.hour,
        insertCount: Number(row.insert_count),
        totalRowsInserted: Number(row.total_rows_inserted),
      })),
      queryErrors: queryErrors.map(row => ({
        eventTime: row.event_time,
        queryId: row.query_id,
        exceptionCode: row.exception_code,
        exception: row.exception,
        query: row.query,
      })),
      unavailableFeatures,
    });
  } catch (error) {
    request.log.error(error, "Failed to get ClickHouse stats");
    return reply.status(500).send({ error: "Failed to get ClickHouse stats" });
  }
}
