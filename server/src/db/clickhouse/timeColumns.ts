/**
 * Every DateTime / DateTime64 column Rybbit stores in ClickHouse, with the
 * UTC-pinned type the CREATE statements declare. The startup migration
 * (ensureUtcTimeColumns) uses this to heal tables created before the timezone
 * was explicit, and scripts/repairUtcPartitions.ts uses it to rebuild tables
 * whose month partitions were named under a non-UTC server timezone.
 *
 * `partitionKey` marks the column the table is `PARTITION BY toYYYYMM(...)`
 * on. Types must match the CREATE statements in schema/*.ts exactly.
 */
export type TimeColumnDefinition = {
  name: string;
  /** The full target type, e.g. `DateTime('UTC')` or `SimpleAggregateFunction(min, DateTime64(3, 'UTC'))`. */
  type: string;
  partitionKey?: boolean;
  /**
   * Before the fix the writer sent this column a timezone-less string, so a
   * non-UTC server stored a shifted instant. Only these columns may be
   * re-read by the repair script's --reinterpret-from. Columns written as an
   * epoch number (replay event timestamps) or by `DEFAULT now()` were always
   * correct and must be left alone.
   */
  naiveWriter?: boolean;
};

export type TimeTableDefinition = {
  columns: TimeColumnDefinition[];
  /**
   * Regenerated wholesale from another table (a refreshable materialized
   * view). The startup migration still pins its type, but there is nothing to
   * repair: the next refresh rewrites it.
   */
  derived?: boolean;
};

// Rollup hour buckets are computed by streaming materialized views from
// events.timestamp in the server timezone, so on a non-UTC server they carry
// the same shift as the events they were built from.
const EVENT_HOUR: TimeTableDefinition = {
  columns: [{ name: "event_hour", type: "DateTime('UTC')", partitionKey: true, naiveWriter: true }],
};

export const UTC_TIME_TABLES = {
  events: {
    columns: [
      { name: "timestamp", type: "DateTime('UTC')", partitionKey: true, naiveWriter: true },
      // Old rows took DEFAULT toDateTime64(timestamp, 3), so they carry timestamp's shift.
      { name: "timestamp_ms", type: "DateTime64(3, 'UTC')", naiveWriter: true },
    ],
  },
  bot_events: { columns: [{ name: "timestamp", type: "DateTime('UTC')", partitionKey: true, naiveWriter: true }] },
  bot_observations: {
    columns: [{ name: "timestamp", type: "DateTime('UTC')", partitionKey: true, naiveWriter: true }],
  },
  // rrweb timestamps were inserted as epoch milliseconds: never shifted.
  session_replay_events: { columns: [{ name: "timestamp", type: "DateTime64(3, 'UTC')", partitionKey: true }] },
  session_replay_metadata: {
    columns: [
      { name: "start_time", type: "DateTime('UTC')", partitionKey: true, naiveWriter: true },
      { name: "end_time", type: "Nullable(DateTime('UTC'))", naiveWriter: true },
      { name: "created_at", type: "DateTime('UTC')" },
    ],
  },
  session_replay_metadata_v2: {
    columns: [
      {
        name: "start_time",
        type: "SimpleAggregateFunction(min, DateTime64(3, 'UTC'))",
        partitionKey: true,
        naiveWriter: true,
      },
      { name: "end_time", type: "SimpleAggregateFunction(max, Nullable(DateTime64(3, 'UTC')))", naiveWriter: true },
    ],
  },
  // Cloud only.
  hourly_events_by_site_mv_target: EVENT_HOUR,
  // LITE_DASHBOARD only.
  sessions_mv_target: {
    columns: [
      {
        name: "start_time",
        type: "SimpleAggregateFunction(min, DateTime('UTC'))",
        partitionKey: true,
        naiveWriter: true,
      },
      { name: "end_time", type: "SimpleAggregateFunction(max, DateTime('UTC'))", naiveWriter: true },
      { name: "last_seen", type: "SimpleAggregateFunction(max, DateTime('UTC'))", naiveWriter: true },
    ],
  },
  overview_hourly_mv_target: EVENT_HOUR,
  pathname_hourly_mv_target: EVENT_HOUR,
  country_hourly_mv_target: EVENT_HOUR,
  device_type_hourly_mv_target: EVENT_HOUR,
  session_hourly_mv_target: {
    columns: [{ name: "session_hour", type: "DateTime('UTC')", partitionKey: true }],
    derived: true,
  },
} satisfies Record<string, TimeTableDefinition>;

export type UtcTimeTable = keyof typeof UTC_TIME_TABLES;

/** Column lists, for the startup migration. */
export const UTC_TIME_COLUMNS = Object.fromEntries(
  Object.entries(UTC_TIME_TABLES).map(([table, definition]) => [table, definition.columns])
) as { [table in UtcTimeTable]: TimeColumnDefinition[] };

/**
 * Rows whose month partition was computed under a different timezone than the
 * column now carries. Only rows within the old offset of a month boundary can
 * be affected, but ClickHouse prunes partitions by the column's current
 * timezone, so a query window that stays inside those boundary hours misses
 * them. The explicit-timezone `toYYYYMM(col, 'UTC')` is deliberately not the
 * partition expression: ClickHouse folds the partition expression itself to
 * the partition's value and would report zero.
 */
export function misplacedPartitionRowsCondition(column: string) {
  return `_partition_id != toString(toYYYYMM(${column}, 'UTC'))`;
}
