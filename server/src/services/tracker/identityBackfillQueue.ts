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

// A mutation interpolates one array element per identity, so this bounds the
// statement rather than the buffer: crossing it triggers an early flush, and a
// flush that finds more than this — identifies that arrived while the previous
// one was in flight — splits into several mutations rather than one huge one.
const MAX_IDENTITIES_PER_MUTATION = 5000;

// A mutation that fails is retried on later flushes. Re-running a partially
// applied backfill is harmless — the `identified_user_id = ''` guard makes the
// tables that already succeeded a no-op — but a permanently failing assignment
// must not circulate forever.
const MAX_ATTEMPTS = 3;

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

type PendingIdentity = IdentityAssignment & { attempts: number };

class IdentityBackfillQueue {
  // Grouped by backfill window, because the window is part of the mutation's
  // WHERE clause: folding a `days: null` admin backfill in with the routine
  // 30-day ones would widen every assignment to a full-history partition scan.
  private pending = new Map<number | null, Map<string, PendingIdentity>>();

  // Flushes are serialised by chaining rather than by a boolean guard. A guard
  // would make a concurrent flush() a silent no-op, which loses two things: a
  // size-triggered flush during a slow one would never run, and shutdown's
  // `await flush()` would return while work was still in flight.
  private chain: Promise<void> = Promise.resolve();

  private logger = createServiceLogger("identity-backfill-queue");

  constructor() {
    setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  enqueue(assignment: IdentityAssignment, days: number | null) {
    this.add({ ...assignment, attempts: 0 }, days);

    const group = this.pending.get(days);
    if (group && group.size >= MAX_IDENTITIES_PER_MUTATION) {
      void this.flush();
    }
  }

  private add(entry: PendingIdentity, days: number | null) {
    let group = this.pending.get(days);
    if (!group) {
      group = new Map();
      this.pending.set(days, group);
    }

    // First assignment wins, matching the un-batched behaviour: the mutation
    // only touches rows where identified_user_id is still empty, so a second
    // identify for the same device in the same window used to find nothing left
    // to update.
    const key = `${entry.siteId}:${entry.anonymousId}`;
    if (!group.has(key)) {
      group.set(key, entry);
    }
  }

  /** Resolves once everything queued at call time has been attempted. */
  flush(): Promise<void> {
    this.chain = this.chain.then(() => this.drain());
    return this.chain;
  }

  /**
   * Drains repeatedly until nothing is left to retry. Only for shutdown: during
   * normal operation a failed assignment should wait for the next interval
   * rather than hot-looping against a ClickHouse that is already struggling,
   * but at shutdown there is no next interval, so a requeued retry would be
   * thrown away by process exit.
   */
  async drainCompletely(): Promise<void> {
    for (let round = 0; round < MAX_ATTEMPTS; round++) {
      await this.flush();
      if (this.pending.size === 0) return;
    }
  }

  private async drain() {
    const groups = [...this.pending.entries()].filter(([, assignments]) => assignments.size > 0);
    if (groups.length === 0) return;

    this.pending = new Map();

    for (const [days, assignments] of groups) {
      const queued = [...assignments.values()];
      for (let start = 0; start < queued.length; start += MAX_IDENTITIES_PER_MUTATION) {
        await this.runBackfill(days, queued.slice(start, start + MAX_IDENTITIES_PER_MUTATION));
      }
    }
  }

  private async runBackfill(days: number | null, assignments: PendingIdentity[]) {
    // Anonymous ids are salted per site, so a bare `user_id IN (…)` would be
    // correct in practice — but it would also let one site's list match another
    // site's rows. Pairing the two into a single key keeps the mutation exact,
    // while the separate `site_id IN (…)` keeps the primary-key prefix usable
    // for pruning.
    const keys = assignments.map(a => `${a.siteId}:${a.anonymousId}`);
    const userIds = assignments.map(a => a.userId);
    const siteIds = [...new Set(assignments.map(a => a.siteId))];

    const failedTables: string[] = [];

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
        failedTables.push(name);
        this.logger.error(
          { table: name, identities: assignments.length, days, err: error },
          "Error backfilling identified_user_id"
        );
      }
    }

    if (failedTables.length === 0) {
      this.logger.info({ identities: assignments.length, days }, "Flushed identity backfill");
      return;
    }

    // Requeue rather than drop: the queue is the only thing that knows about
    // these assignments. The alias row in Postgres already exists, so a later
    // identify for the same device takes the "alias unchanged" path and never
    // schedules another backfill — a dropped failure leaves those rows
    // anonymous permanently.
    const retryable = assignments.filter(a => a.attempts + 1 < MAX_ATTEMPTS);
    const exhausted = assignments.length - retryable.length;

    for (const assignment of retryable) {
      this.add({ ...assignment, attempts: assignment.attempts + 1 }, days);
    }

    this.logger.warn(
      { failedTables, requeued: retryable.length, dropped: exhausted, days },
      "Identity backfill partially failed"
    );

    if (exhausted > 0) {
      this.logger.error(
        { dropped: exhausted, days, maxAttempts: MAX_ATTEMPTS },
        "Giving up on identity backfill; those rows stay anonymous"
      );
    }
  }
}

export const identityBackfillQueue = new IdentityBackfillQueue();
