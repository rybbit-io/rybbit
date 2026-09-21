# Long-range dashboard storage

Optional acceleration for the lite dashboard on ClickHouse 26.3 or newer. It requires the existing, populated lite materialized views. Reads remain disabled by default; normal deployments keep their existing query paths.

## What changes

- Overview totals and day/week/month/year charts merge hourly, daily, or monthly summaries from a single atomic session snapshot. Complete periods use the coarsest compatible resolution; partial periods use hourly rows. Configured chart timezones get local-calendar summaries, including DST. Other chart timezones use compact hourly states.
- The session snapshot uses `uniqCombined64` states instead of `uniq`, with 64-row index granules and Wide parts. Users remain approximate; changing the estimator can slightly change displayed user counts. Sessions, pageviews, bounces, and duration remain additive.
- Countries, devices, and configured route groups use aggregate projections on their streaming hourly tables. Historical projection materialization and new inserts are managed by ClickHouse, avoiding an overlapping manual INSERT backfill. Projections retain mergeable distinct-session states; counts are never added across periods or URLs.
- Top Pages defaults to **Route groups** for month/year/all-time selections and ranges of 30+ days when enabled. The Pages tab remains available. Clicking a group loads its original URLs; it does not apply a literal template pathname filter. Filtered and exact-time route requests use raw events, including in standard deployments.

The shared 30-second response cache and live-user requests are unchanged. Session snapshots retain the existing hourly refresh cadence. Route/country/device projections update with their streaming source, so they add no refresh delay.

## Prepare and activate

Set backend environment variables, initially leaving both read flags disabled. Include the timezones people actually use for charts. UTC is always included; at most eight timezones are supported.

```dotenv
DASHBOARD_ROLLUPS=false
DASHBOARD_ROLLUP_TIME_ZONES=UTC,America/New_York,Asia/Seoul
DASHBOARD_ROUTE_GROUPS=false
DASHBOARD_ROUTE_PATTERNS=[{"siteId":1,"path":"/summoners/:region/:player"}]
```

`siteId` is optional: omit it to apply a template to every site. The first matching template wins. A `:name` parameter matches one nonempty path segment, with an optional trailing slash. Descendants need their own templates, e.g. `/summoners/:region/:player/matches`. Unmatched URLs stay unchanged. There are no implicit guesses about player names, UUIDs, or other identifiers.

Route projections are shared by sites with the same effective templates. At most eight distinct template sets can be provisioned (three projections per set). Avoid creating a different ruleset for every site.

From `server/`, using the deployment's ClickHouse environment:

```sh
# Review the SQL. This command only prints it.
npm run prepare:dashboard-rollups -- --materialize

# Explicit operator action: create the new target/view and projections,
# and enqueue historical projection materialization.
npm run prepare:dashboard-rollups -- --apply --materialize

# After the refresh and materialization finish:
npm run prepare:dashboard-rollups -- --validate
```

In an existing backend container with the new build, the equivalent entry point is `node dist/scripts/prepareDashboardRollups.js`. The script imports only the ClickHouse client; it does not start the application or invoke Postgres migrations.

Preparation never truncates/replaces the existing lite targets. The new session refresh replaces its own target atomically, including its first full-history population. Projection materialization is asynchronous and can require substantial disk/CPU; schedule it outside busy hours. `--validate` checks a recent successful refresh, agreement between every session resolution, completion of mutations, and projection coverage of every active source part. It fails for absent projections, not just unfinished ones. Validation is a consistency check, not a benchmark or an independent audit of the original lite backfill.

After validation succeeds, enable `DASHBOARD_ROLLUPS=true` and `DASHBOARD_ROUTE_GROUPS=true` and restart the backend workers. Docker Compose passes these variables through; no new client build flag is required. All workers must use the same configuration. Runtime checks coalesce/cache session readiness for 30 seconds and reject missing or older-than-two-hour snapshots. Query failures temporarily fall back to the legacy path. Projection reads can also use original source parts if a projection is unavailable, preserving correctness while losing acceleration.

Changing configured timezones creates a new versioned session target/view and requires preparation and validation again. Changing route templates creates different projections; materialize them before enabling the new route configuration. Old storage is retained for rollback and must be retired separately after validating the replacement. ClickHouse limits the number of projections per table, so remove obsolete route projections before accumulating many configurations.

## Rollback and limits

Disable the two read flags and restart workers to restore the previous dashboard paths. Existing cached responses expire within 30 seconds. Optional refresh jobs and projections continue consuming resources until an operator stops/removes them; disabling reads alone does not remove storage.

This change reduces **interactive query work**, but the new session refresh still scans `sessions_mv_target FINAL` over its history. The legacy hourly refresh is retained because homepage/fallback consumers still use it. Do not disable that legacy view yet. Replacing both refresh jobs with an incremental session-update pipeline is a separate task: session duration, bounce status, and identity can change, so treating historical session summaries as immutable would produce wrong counts.

Arbitrary filters and individual-URL drilldowns can still be expensive on large ranges. Unconfigured route patterns cannot reduce URL cardinality. Imported/deleted historical data must already be reconciled into the underlying lite targets; these summaries cannot repair an incomplete source backfill.

## Correctness checks

Unit/component tests cover range partitioning, DST, configuration/fallback behavior, route matching, long-range defaults, lazy URL loading, and drilldown.

An optional integration suite builds a small, isolated synthetic database, checks results against the existing hourly queries, and asserts that ClickHouse actually selects the projections. It creates and drops only a uniquely named test database. Run it against a disposable ClickHouse server, never an application database:

```sh
DASHBOARD_ROLLUP_TEST_URL=http://localhost:8123 \
  npx vitest run src/services/dashboardRollups/rollups.clickhouse.test.ts
```

No production performance benchmark is included. The expected speedup must not be presented as a measured result.
