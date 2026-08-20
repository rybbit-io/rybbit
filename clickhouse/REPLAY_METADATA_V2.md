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
  knows its own slice of the session.
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

Run once, after the deploy:

```sql
INSERT INTO session_replay_metadata_v2
SELECT
  site_id, session_id, user_id, identified_user_id,
  start_time, end_time, event_count, compressed_size_bytes,
  page_url, country, region, city, lat, lon,
  browser, browser_version, operating_system, operating_system_version,
  language, screen_width, screen_height, device_type,
  channel, hostname, referrer, has_replay_data
FROM session_replay_metadata
FINAL
WHERE start_time >= now() - INTERVAL 30 DAY;
```

`FINAL` matters: without it the old table's superseded versions are copied too,
and because the new engine **sums** `event_count` rather than replacing it,
every session would be inflated by its own history.

For the same reason this statement is **not idempotent**. Running it twice
doubles `event_count` and `compressed_size_bytes` for every session. If it is
interrupted, clear the table before retrying:

```sql
TRUNCATE TABLE session_replay_metadata_v2;
```

That is safe only while the deploy is fresh — it also discards post-deploy
increments, which the backfill cannot recover.

The 30-day bound matches the table's TTL; older rows would be deleted on the
next TTL pass anyway.

## 3. Verify

Totals should agree, modulo sessions that received events between the two
reads:

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

Nothing in the application references it after the deploy; it is kept only as
the rollback path.

---

# Related: clearing impossible partitions

Replay event timestamps come from the browser, so devices with broken clocks
wrote rows dated 2032, 2035, 2064, 2076 and 2090. Those partitions grow the
partition list permanently and, because the TTL is `start_time + 30 DAY`, they
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
