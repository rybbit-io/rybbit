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
};

const EVENT_HOUR: TimeColumnDefinition[] = [{ name: "event_hour", type: "DateTime('UTC')", partitionKey: true }];

export const UTC_TIME_COLUMNS = {
  events: [
    { name: "timestamp", type: "DateTime('UTC')", partitionKey: true },
    { name: "timestamp_ms", type: "DateTime64(3, 'UTC')" },
  ],
  bot_events: [{ name: "timestamp", type: "DateTime('UTC')", partitionKey: true }],
  bot_observations: [{ name: "timestamp", type: "DateTime('UTC')", partitionKey: true }],
  session_replay_events: [{ name: "timestamp", type: "DateTime64(3, 'UTC')", partitionKey: true }],
  session_replay_metadata: [
    { name: "start_time", type: "DateTime('UTC')", partitionKey: true },
    { name: "end_time", type: "Nullable(DateTime('UTC'))" },
    { name: "created_at", type: "DateTime('UTC')" },
  ],
  session_replay_metadata_v2: [
    { name: "start_time", type: "SimpleAggregateFunction(min, DateTime64(3, 'UTC'))", partitionKey: true },
    { name: "end_time", type: "SimpleAggregateFunction(max, Nullable(DateTime64(3, 'UTC')))" },
  ],
  // Cloud only.
  hourly_events_by_site_mv_target: EVENT_HOUR,
  // LITE_DASHBOARD only.
  sessions_mv_target: [
    { name: "start_time", type: "SimpleAggregateFunction(min, DateTime('UTC'))", partitionKey: true },
    { name: "end_time", type: "SimpleAggregateFunction(max, DateTime('UTC'))" },
    { name: "last_seen", type: "SimpleAggregateFunction(max, DateTime('UTC'))" },
  ],
  overview_hourly_mv_target: EVENT_HOUR,
  pathname_hourly_mv_target: EVENT_HOUR,
  country_hourly_mv_target: EVENT_HOUR,
  device_type_hourly_mv_target: EVENT_HOUR,
  session_hourly_mv_target: [{ name: "session_hour", type: "DateTime('UTC')", partitionKey: true }],
} satisfies Record<string, TimeColumnDefinition[]>;

export type UtcTimeTable = keyof typeof UTC_TIME_COLUMNS;

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
