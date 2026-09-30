# Cutover: `session_replay_metadata` → `session_replay_metadata_v2`

The old table is a `ReplacingMergeTree` holding one cumulative row per session.
Keeping that row current meant every replay batch re-read the whole session
(`SELECT MIN/MAX/COUNT/SUM … FROM session_replay_events WHERE session_id = …`)
and rewrote it. In one six-day window that read scanned **818 billion rows —
76% of everything the cluster read** — and the rewrites left **2.5 million
single-row parts**.

`session_replay_metadata_v2` is an `AggregatingMergeTree`. Each batch inserts
only what it observed and the engine combines rows at merge time, so ingest
never reads back. Column names and their post-merge meanings are unchanged;
readers already used `FINAL`, which is all that is needed.

## Known limitation: snapshot columns merge independently

`page_url`, the geo fields, `browser`, `language` and the rest use
`SimpleAggregateFunction(anyLast, …)`, so each one merges on its own. The old
`ReplacingMergeTree(created_at)` picked one whole winning row, so a session
whose batches disagreed always showed a single coherent snapshot; the new table
can assemble one from several batches.

Measured over 30 days of production, of the 423 sessions carrying more than one
metadata version:

| field | sessions that differed |
| --- | --- |
| `page_url` | 62 |
| `screen_width` / `screen_height` | 28 / 32 |
| `region`, `city`, `lat` | 18 |
| `language` | 13 |
| `country` | 11 |
| `browser`, `operating_system`, `device_type`, `channel`, `hostname`, `referrer`, `user_id` | 0 |

`screen_width`/`screen_height` are unaffected — they use `max`, which is what
the old code computed anyway.

The geo group is the real exposure: `country`, `region`, `city` and `lat`/`lon`
are only meaningful together, and roughly 4% of multi-version sessions could
show a city and a country taken from different batches.

**This was weighed and accepted in August 2026.** The exposure is narrow, the
affected fields are all still true of the session, and the alternatives cost
more than the defect. The rest of this section records what the options were, so
the decision can be revisited if mixed geo ever turns out to mislead someone.

Making the snapshot coherent means versioning it as a unit — either one
`SimpleAggregateFunction(max, Tuple(version, …))`, or `argMaxState` columns read
with `argMaxMerge` and `GROUP BY`. Both change every read site, and the tuple
form carries a sharp edge: `SELECT snapshot.page_url FROM … FINAL` silently
returns the *unmerged* value, because ClickHouse resolves the named element as a
subcolumn read and skips the merge. Positional access (`snapshot.2`) merges
correctly, as does selecting the whole tuple in a subquery first.

## Columns that are gone

Two columns are gone:

- `duration_ms` — derived at read time as
  `dateDiff('millisecond', start_time, end_time)`, because a single batch only
  knows its own slice of the session. `start_time`/`end_time` are
  `DateTime64(3)` for exactly this reason: at second resolution a 900 ms replay
  would derive a duration of 0.
- `created_at` — there is no version column to order by any more.

The application creates the new table on boot. The steps below move the
existing data across and are **not** run by the app.

## 1. Deploy

Deploying repoints both writes and reads at `session_replay_metadata_v2`. From
this moment the old table is frozen — nothing writes to it.

Sessions already in flight keep working: the backfill below copies their
totals so far, and post-deploy batches add their own increments on top. The
aggregate columns sum, so the two halves combine to the correct total.

## 2. Backfill

Use a maintenance window after the deploy. Pause all replay writers, including
other backend replicas and queued work, and wait for in-flight inserts to finish.
Take a recoverable backup of both metadata tables before proceeding. Do not
backfill directly into the live v2 table: it already contains post-deploy
increments that the legacy table cannot reconstruct.

Before copying the legacy table, apply every applicable user/site deletion since
the cutover to it as well. Current application deletion paths cover v2 and any
existing `session_replay_metadata` and `session_replay_metadata_v2_backfill`
tables, but earlier deployments may have left deleted data in the legacy table.
If you cannot establish that the legacy rows are
still permitted to be retained, do not backfill or restore them.

Build a new staging table while both sources are frozen. Use the exact unused
name below so application privacy deletions also cover it, and the same
schema/engine as v2:

```sql
CREATE TABLE session_replay_metadata_v2_backfill AS session_replay_metadata_v2;

-- Preserve all live post-deploy increments before adding historical totals.
INSERT INTO session_replay_metadata_v2_backfill
SELECT * FROM session_replay_metadata_v2;
```

Then copy the historical totals into that staging table once:

```sql
INSERT INTO session_replay_metadata_v2_backfill
SELECT
  site_id, session_id, user_id, identified_user_id,
  start_time,
  -- The old bounds are second-resolution but the old `duration_ms` was exact,
  -- so rebuild `end_time` from it rather than copying the rounded column —
  -- otherwise every historical replay's duration is re-derived to the second.
  if(duration_ms IS NULL,
     CAST(toDateTime64(end_time, 3) AS Nullable(DateTime64(3))),
     CAST(toDateTime64(start_time, 3) + toIntervalMillisecond(assumeNotNull(duration_ms)) AS Nullable(DateTime64(3)))) AS end_time,
  event_count, compressed_size_bytes,
  page_url, country, region, city, lat, lon,
  browser, browser_version, operating_system, operating_system_version,
  language, screen_width, screen_height, device_type,
  channel, hostname, referrer, has_replay_data
FROM session_replay_metadata
FINAL
WHERE start_time >= now() - INTERVAL 30 DAY;
```

`start_time` still lands on a whole second for backfilled rows, because that is
all the old table recorded. Rows written after the deploy carry true
millisecond bounds on both ends.

`FINAL` matters: without it the old table's superseded versions are copied too,
and because the new engine **sums** `event_count` rather than replacing it,
every session would be inflated by its own history.

For the same reason this statement is **not idempotent**. Running it twice
doubles historical `event_count` and `compressed_size_bytes`. If a staging copy
is interrupted **before the exchange**, the two frozen source tables remain
unchanged. Recreate only the staging table, then repeat both copies into the
empty staging table. Never truncate the live v2 table, even immediately after
deployment: it may already contain increments that exist nowhere in the legacy
metadata table.

Verify the staging totals against the sum of the two frozen sources, inspect
real sessions, and ensure the database supports `EXCHANGE TABLES` (Atomic
database engine). Only after validation, with writers still paused, publish it:

```sql
EXCHANGE TABLES session_replay_metadata_v2 AND session_replay_metadata_v2_backfill;
```

After the exchange the staging name holds the original post-deploy-only table.
Retain that backup until verification is complete, then resume writers. Do not
repeat the historical insert or the exchange after a successful cutover.

If a previous direct-to-live backfill was interrupted or repeated, stop writers
and preserve the affected table before investigating. Its additive totals do
not identify which rows came from the historical copy, so there is no generic
safe truncate-and-retry recovery. Reconcile from a known pre-backfill backup
and recoverable replay batches, or build and validate a replacement from the
retained raw events and legacy snapshot. Do not replace the live table until
all post-deploy increments and applicable deletions have been accounted for.

The 30-day bound matches the table's TTL; older rows would be deleted on the
next TTL pass anyway.

## 3. Verify

With writers paused, staging totals should equal historical totals plus the
original v2 post-deploy increments. After publication, v2 therefore need not
equal the legacy table alone. Once writers resume, account for newly ingested
sessions when comparing totals:

```sql
SELECT count() AS sessions, sum(event_count) AS events
FROM session_replay_metadata FINAL
WHERE start_time >= now() - INTERVAL 30 DAY;

SELECT count() AS sessions, sum(event_count) AS events
FROM session_replay_metadata_v2 FINAL
WHERE start_time >= now() - INTERVAL 30 DAY;
```

Also confirm ingest is no longer reading the session back:

```sql
SELECT count()
FROM system.query_log
WHERE event_time > now() - INTERVAL 10 MINUTE
  AND query LIKE '%FROM session_replay_events%'
  AND query LIKE '%compressed_size_bytes%';
```

Expect zero.

## 4. Drop the old table

Once the dashboard has been checked against real sessions and you are happy to
lose the ability to roll back:

```sql
DROP TABLE session_replay_metadata;
```

The application no longer inserts into or reads it for analytics after the
deploy, but privacy deletion paths still erase matching legacy rows. Keeping it
is not a complete rollback plan: it lacks post-deploy batches. While it is
retained, verify deletions have completed in it and the named staging table.
Any differently named copies or external backups need separate deletion and
retention handling; the application cannot discover arbitrary copies. Drop the
legacy table promptly once validation allows. A rollback must
reconcile post-deploy data and apply all applicable deletions before any legacy
rows are made readable again; if that cannot be established, do not roll back
to the legacy table.

---

# Related: clearing impossible partitions

Replay event timestamps come from the browser, so devices with broken clocks
wrote rows dated 2032, 2035, 2064, 2076 and 2090. Those partitions grow the
partition list permanently and, because the TTL is `toDateTime(start_time) + 30 DAY`, they
never expire.

Ingest now corrects this (`server/src/services/replay/replayClockSkew.ts`): a
batch whose median timestamp is more than a day ahead, or more than 30 days
behind, is shifted onto server time as a whole, preserving the gaps between
events so playback still reconstructs. **No new impossible partitions are
created after the deploy.**

The existing ones still need removing. List them first:

```sql
SELECT table, partition, sum(rows) AS rows, count() AS parts
FROM system.parts
WHERE active AND database = currentDatabase()
  AND table IN ('session_replay_events', 'session_replay_metadata_v2')
  AND partition > formatDateTime(now() + INTERVAL 2 MONTH, '%Y%m')
GROUP BY table, partition
ORDER BY table, partition;
```

Then drop each one by name — a few hundred rows of unplayable recordings from
devices whose clocks were decades out:

```sql
ALTER TABLE session_replay_events DROP PARTITION '209007';
```

Check the listing rather than copying partition ids from here; the set will
have changed.
