import { processResults } from "../../api/analytics/utils/utils.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { r2Storage } from "../storage/r2StorageService.js";

const logger = createServiceLogger("replay-payload-storage");
const PARALLEL_BATCH_SIZE = 50;

type AnalyticsStore = Pick<typeof clickhouse, "command" | "insert" | "query">;

interface ObjectBatchStorage {
  deleteBatch(key: string): Promise<void>;
  getBatch(key: string): Promise<any[]>;
  isEnabled(): boolean;
  storeBatch(siteId: number, sessionId: string, eventDataArray: any[]): Promise<string | null>;
}

interface ReplayPayloadEvent {
  data: any;
  timestamp: number;
  type: string | number;
}

interface StoreReplayEventsInput {
  events: ReplayPayloadEvent[];
  identifiedUserId: string;
  sessionId: string;
  siteId: number;
  userId: string;
  viewportHeight?: number;
  viewportWidth?: number;
}

export interface StoredReplayEventStats {
  eventCount: number;
  payloadSizeBytes: number;
}

export interface ReplayEventPayload {
  data: any;
  timestamp: number;
  type: string;
}

interface ReplayEventRow {
  batch_index: number | null;
  data: string;
  event_data_key: string | null;
  timestamp: number;
  type: string;
}

interface PayloadColumns {
  batch_index: number | null;
  event_data: string;
  event_data_key: string | null;
}

interface PlacedPayloadBatch {
  columns: PayloadColumns[];
  compensate(): Promise<void>;
}

interface ReplayPayloadAdapter {
  place(siteId: number, sessionId: string, payloads: any[], serializedPayloads: string[]): Promise<PlacedPayloadBatch>;
}

/** Stores replay payloads inline in ClickHouse. */
class InlineReplayPayloadAdapter implements ReplayPayloadAdapter {
  async place(
    _siteId: number,
    _sessionId: string,
    _payloads: any[],
    serializedPayloads: string[]
  ): Promise<PlacedPayloadBatch> {
    return {
      columns: serializedPayloads.map(event_data => ({
        batch_index: null,
        event_data,
        event_data_key: null,
      })),
      compensate: async () => undefined,
    };
  }

  reconstruct(rows: ReplayEventRow[]): ReplayEventPayload[] {
    return rows.map(row => ({
      data: JSON.parse(row.data),
      timestamp: row.timestamp,
      type: row.type,
    }));
  }
}

/** Stores replay payloads in object storage and leaves keyed references in ClickHouse. */
class KeyedReplayPayloadAdapter implements ReplayPayloadAdapter {
  constructor(private readonly objectStorage: ObjectBatchStorage) {}

  async place(
    siteId: number,
    sessionId: string,
    payloads: any[],
    serializedPayloads: string[]
  ): Promise<PlacedPayloadBatch> {
    const key = await this.objectStorage.storeBatch(siteId, sessionId, payloads);
    if (!key) {
      throw new Error("Object storage did not return a replay payload key");
    }

    return {
      columns: serializedPayloads.map((_eventData, batch_index) => ({
        batch_index,
        event_data: "",
        event_data_key: key,
      })),
      compensate: () => this.objectStorage.deleteBatch(key),
    };
  }

  async reconstruct(key: string, rows: ReplayEventRow[]): Promise<ReplayEventPayload[]> {
    const payloads = await this.objectStorage.getBatch(key);
    const events: ReplayEventPayload[] = [];

    for (const row of rows) {
      const index = row.batch_index;
      if (index === null || index < 0 || index >= payloads.length) {
        continue;
      }

      events.push({
        data: payloads[index],
        timestamp: row.timestamp,
        type: row.type,
      });
    }

    return events;
  }

  async delete(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.objectStorage.deleteBatch(key)));
  }
}

/**
 * Owns the full lifetime of replay event payloads across ClickHouse and object
 * storage. Callers do not need to know where a payload is placed or how keyed
 * payloads are reconstructed and compensated.
 */
export class ReplayPayloadStorage {
  private readonly inlineAdapter = new InlineReplayPayloadAdapter();
  private readonly keyedAdapter: KeyedReplayPayloadAdapter;

  constructor(
    private readonly analyticsStore: AnalyticsStore = clickhouse,
    private readonly objectStorage: ObjectBatchStorage = r2Storage
  ) {
    this.keyedAdapter = new KeyedReplayPayloadAdapter(objectStorage);
  }

  async storeEvents(input: StoreReplayEventsInput): Promise<StoredReplayEventStats> {
    const { events, identifiedUserId, sessionId, siteId, userId, viewportHeight, viewportWidth } = input;
    const serializedPayloads = events.map(event => JSON.stringify(event.data));
    const payloadSizeBytes = serializedPayloads.reduce((total, payload) => total + payload.length, 0);

    if (events.length === 0) {
      return { eventCount: 0, payloadSizeBytes };
    }

    let placedBatch: PlacedPayloadBatch;
    if (this.objectStorage.isEnabled()) {
      try {
        placedBatch = await this.keyedAdapter.place(
          siteId,
          sessionId,
          events.map(event => event.data),
          serializedPayloads
        );
      } catch (error) {
        logger.error({ err: error, sessionId, siteId }, "Failed to store replay payload batch; using inline storage");
        placedBatch = await this.inlineAdapter.place(siteId, sessionId, [], serializedPayloads);
      }
    } else {
      placedBatch = await this.inlineAdapter.place(siteId, sessionId, [], serializedPayloads);
    }

    const rows = events.map((event, index) => ({
      site_id: siteId,
      session_id: sessionId,
      user_id: userId,
      identified_user_id: identifiedUserId,
      timestamp: event.timestamp,
      event_type: event.type,
      ...placedBatch.columns[index],
      sequence_number: index,
      event_size_bytes: serializedPayloads[index].length,
      viewport_width: viewportWidth || null,
      viewport_height: viewportHeight || null,
      is_complete: 0,
    }));

    try {
      await this.analyticsStore.insert({
        table: "session_replay_events",
        values: rows,
        format: "JSONEachRow",
      });
    } catch (error) {
      try {
        await placedBatch.compensate();
      } catch (compensationError) {
        logger.error(
          { err: compensationError, sessionId, siteId },
          "Failed to compensate replay payload after ClickHouse insert failure"
        );
      }
      throw error;
    }

    return { eventCount: rows.length, payloadSizeBytes };
  }

  async readSessionEvents(siteId: number, sessionId: string): Promise<ReplayEventPayload[]> {
    const result = await this.analyticsStore.query({
      query: `
        SELECT
          toUnixTimestamp64Milli(timestamp) as timestamp,
          event_type as type,
          event_data as data,
          event_data_key,
          batch_index
        FROM session_replay_events
        WHERE site_id = {siteId:UInt16}
          AND session_id = {sessionId:String}
        ORDER BY timestamp ASC, sequence_number ASC
      `,
      query_params: { siteId, sessionId },
      format: "JSONEachRow",
    });
    const rows = await processResults<ReplayEventRow>(result);

    const inlineRows: ReplayEventRow[] = [];
    const keyedRows = new Map<string, ReplayEventRow[]>();
    for (const row of rows) {
      if (row.event_data_key) {
        const batch = keyedRows.get(row.event_data_key) ?? [];
        batch.push(row);
        keyedRows.set(row.event_data_key, batch);
      } else {
        inlineRows.push(row);
      }
    }

    const events = this.inlineAdapter.reconstruct(inlineRows);
    const keyedBatches = [...keyedRows.entries()];

    for (let index = 0; index < keyedBatches.length; index += PARALLEL_BATCH_SIZE) {
      const batchSlice = keyedBatches.slice(index, index + PARALLEL_BATCH_SIZE);
      const reconstructed = await Promise.all(
        batchSlice.map(async ([key, batchRows]) => {
          try {
            return await this.keyedAdapter.reconstruct(key, batchRows);
          } catch (error) {
            logger.error({ err: error, key, sessionId, siteId }, "Failed to fetch keyed replay payload batch");
            // Returning a partial replay makes corruption look like a valid
            // recording. Fail the read so callers can retry after object
            // storage is restored.
            throw error;
          }
        })
      );
      events.push(...reconstructed.flat());
    }

    events.sort((left, right) => left.timestamp - right.timestamp);
    return events;
  }

  async deleteSessionEvents(siteId: number, sessionId: string): Promise<void> {
    const queryParams = { siteId, sessionId };
    const condition = `site_id = {siteId:UInt16} AND session_id = {sessionId:String}`;

    await this.deleteKeyedPayloads(condition, queryParams);
    await this.analyticsStore.command({
      query: `DELETE FROM session_replay_events WHERE ${condition}`,
      query_params: queryParams,
    });
  }

  async deleteUserEvents(siteId: number, userId: string, deviceIds: string[]): Promise<void> {
    const queryParams = { siteId, userId, deviceIds };
    const condition = `site_id = {siteId:UInt16}
      AND (
        identified_user_id = {userId:String}
        OR (user_id IN ({deviceIds:Array(String)}) AND identified_user_id = '')
      )`;

    await this.deleteKeyedPayloads(condition, queryParams);
    await this.analyticsStore.command({
      query: `DELETE FROM session_replay_events WHERE ${condition}`,
      query_params: queryParams,
    });
  }

  private async deleteKeyedPayloads(condition: string, queryParams: Record<string, unknown>): Promise<void> {
    const result = await this.analyticsStore.query({
      query: `
        SELECT DISTINCT event_data_key
        FROM session_replay_events
        WHERE ${condition}
          AND event_data_key IS NOT NULL
      `,
      query_params: queryParams,
      format: "JSONEachRow",
    });
    const rows = await processResults<{ event_data_key: string | null }>(result);
    const keys = rows.flatMap(row => (row.event_data_key ? [row.event_data_key] : []));

    // A keyed row is object-backed regardless of whether object storage is
    // configured today. If cleanup cannot run, retain the ClickHouse references
    // so the deletion can be retried instead of orphaning inaccessible objects.
    await this.keyedAdapter.delete(keys);
  }
}

export const replayPayloadStorage = new ReplayPayloadStorage();
