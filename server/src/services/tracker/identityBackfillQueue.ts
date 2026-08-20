import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

// Identify calls arrive continuously, and each one used to submit three
// `ALTER TABLE … UPDATE` mutations immediately. Mutation submission takes the
// MergeTree parts lock, so a steady identify rate turns into a steady stream of
// lock acquisitions: measured at a 12-second median gap on `events`, which is
// short enough that inserts and selects are near-permanently contending. The
// table is not slower on average — it periodically freezes, and p90 insert
// latency runs ~100x baseline inside a submission window.
//
// Buffering fixes the frequency rather than the cost. One flush covers every
// identity assigned in the interval, so N identifies cost one mutation per
// table instead of N, and the gaps between them are long enough for the lock to
// stay uncontended in between.
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;

// A flush interpolates one array element per pending identity, so an
// unbounded buffer would eventually build an unbounded query. Sites that
// identify faster than this flush early instead of growing the statement.
const MAX_PENDING_PER_WINDOW = 5000;

type BackfillTable = { name: string; timeColumn: string };

// session_replay_metadata has no `timestamp` column; its time column is
// `start_time`. Using `timestamp` there throws ClickHouse error 47
// (UNKNOWN_IDENTIFIER), so map each table to its actual time column.
const TABLES: BackfillTable[] = [
  { name: "events", timeColumn: "timestamp" },
  { name: "session_replay_events", timeColumn: "timestamp" },
  { name: "session_replay_metadata_v2", timeColumn: "start_time" },
];

export type IdentityAssignment = {
  siteId: number;
  anonymousId: string;
  userId: string;
};

class IdentityBackfillQueue {
  // Grouped by backfill window, because the window is part of the mutation's
  // WHERE clause: folding a `days: null` admin backfill in with the routine
  // 30-day ones would widen every assignment to a full-history partition scan.
  private pending = new Map<number | null, Map<string, IdentityAssignment>>();
  private flushing = false;
  private logger = createServiceLogger("identity-backfill-queue");

  constructor() {
    setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  enqueue(assignment: IdentityAssignment, days: number | null) {
    let group = this.pending.get(days);
    if (!group) {
      group = new Map();
      this.pending.set(days, group);
    }

    // First assignment wins, matching the un-batched behaviour: the mutation
    // only touches rows where identified_user_id is still empty, so a second
    // identify for the same device in the same window used to find nothing left
    // to update.
    const key = `${assignment.siteId}:${assignment.anonymousId}`;
    if (!group.has(key)) {
      group.set(key, assignment);
    }

    if (group.size >= MAX_PENDING_PER_WINDOW) {
      void this.flush();
    }
  }

  async flush() {
    if (this.flushing) return;

    const groups = [...this.pending.entries()].filter(([, assignments]) => assignments.size > 0);
    if (groups.length === 0) return;

    this.flushing = true;
    this.pending = new Map();

    try {
      for (const [days, assignments] of groups) {
        await this.runBackfill(days, [...assignments.values()]);
      }
    } finally {
      this.flushing = false;
    }
  }

  private async runBackfill(days: number | null, assignments: IdentityAssignment[]) {
    // Anonymous ids are salted per site, so a bare `user_id IN (…)` would be
    // correct in practice — but it would also let one site's list match another
    // site's rows. Pairing the two into a single key keeps the mutation exact,
    // while the separate `site_id IN (…)` keeps the primary-key prefix usable
    // for pruning.
    const keys = assignments.map(a => `${a.siteId}:${a.anonymousId}`);
    const userIds = assignments.map(a => a.userId);
    const siteIds = [...new Set(assignments.map(a => a.siteId))];

    for (const { name, timeColumn } of TABLES) {
      try {
        await clickhouse.command({
          query: `
            ALTER TABLE ${name}
            UPDATE identified_user_id = transform(
              concat(toString(site_id), ':', user_id),
              {keys: Array(String)},
              {userIds: Array(String)},
              identified_user_id
            )
            WHERE site_id IN {siteIds: Array(UInt16)}
              AND concat(toString(site_id), ':', user_id) IN {keys: Array(String)}
              AND identified_user_id = ''${
                days !== null ? `\n              AND ${timeColumn} >= now() - INTERVAL {days: UInt16} DAY` : ""
              }
          `,
          query_params: { keys, userIds, siteIds, ...(days !== null ? { days } : {}) },
        });
      } catch (error) {
        this.logger.error(
          { table: name, identities: assignments.length, days, err: error },
          "Error backfilling identified_user_id"
        );
      }
    }

    this.logger.info({ identities: assignments.length, days }, "Flushed identity backfill");
  }
}

export const identityBackfillQueue = new IdentityBackfillQueue();
