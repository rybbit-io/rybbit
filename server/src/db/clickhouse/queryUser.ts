import SqlString from "sqlstring";
import { CLICKHOUSE_QUERY_USER, clickhouse, clickhouseQuery } from "./client.js";
import { clickhouseInitLogger as logger } from "./initUtils.js";
import { QUERY_USER_LIMITS } from "./queryLimits.js";

export { QUERY_USER_LIMITS } from "./queryLimits.js";

// Least-privilege ClickHouse user for user-authored SQL (custom query page and
// dashboard cards). Provisioned with SQL at startup so every deployment type
// (compose, Kubernetes, managed ClickHouse) gets it without hand-editing
// users.d, and so the limits below are re-applied on upgrade. Requires the main
// connection to have access_management (the bundled compose sets
// CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1); otherwise the steps fail, the error
// is logged, and custom queries fail closed until the user is created by hand.
//
// Tenant isolation is enforced here, not only by the SQL validator: a row
// policy limits every read of events by this user to the site ids the backend
// sends in the SITE_SCOPE_HEADER HTTP header. SQL can't set HTTP headers and
// allow_get_client_http_header is pinned READONLY, so a validator bypass still
// lands inside the caller's own sites, with no table functions
// (url/s3/file/remote…), no system tables, and the pinned resource limits.
// A request without the header reads no rows.
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const SITE_SCOPE_HEADER = "X-Rybbit-Site-Ids";

// Per-request headers for clickhouseQuery: the site ids the row policy admits.
export function siteScopeHeaders(siteIds: number[]): Record<string, string> {
  return { [SITE_SCOPE_HEADER]: JSON.stringify(siteIds) };
}

export function buildQueryUserStatements(database: string, user: string, password: string): string[] {
  if (!IDENTIFIER.test(database) || !IDENTIFIER.test(user)) {
    throw new Error("ClickHouse database and query user names must be plain identifiers");
  }
  const profile = user;
  const secret = SqlString.escape(password);
  const l = QUERY_USER_LIMITS;
  // readonly=2 lets a query's SETTINGS clause change settings, and for most
  // limits 0 means "unlimited", so each guardrail is marked READONLY (a settings
  // constraint) rather than merely bounded.
  const profileSettings = [
    "readonly = 2 READONLY",
    `max_execution_time = ${l.maxExecutionTimeSeconds} READONLY`,
    `max_memory_usage = ${l.maxMemoryUsageBytes} READONLY`,
    `max_threads = ${l.maxThreads} READONLY`,
    `max_result_rows = ${l.maxResultRows} READONLY`,
    "result_overflow_mode = 'break' READONLY",
    `max_concurrent_queries_for_user = ${l.maxConcurrentQueriesForUser} READONLY`,
    `max_bytes_before_external_group_by = ${l.maxBytesBeforeExternalBytes} READONLY`,
    `max_bytes_before_external_sort = ${l.maxBytesBeforeExternalBytes} READONLY`,
    // The row policy reads the site scope from the request's HTTP header.
    "allow_get_client_http_header = 1 READONLY",
    "enable_json_type = 1",
    "log_queries = 0",
  ].join(", ");

  return [
    `CREATE SETTINGS PROFILE IF NOT EXISTS ${profile}`,
    `ALTER SETTINGS PROFILE ${profile} SETTINGS ${profileSettings}`,
    `CREATE USER IF NOT EXISTS ${user} IDENTIFIED WITH sha256_password BY ${secret}`,
    // Re-assert the password and profile so an env change or a drifted user is corrected.
    `ALTER USER ${user} IDENTIFIED WITH sha256_password BY ${secret} SETTINGS PROFILE ${SqlString.escape(profile)}`,
    // Reset grants to exactly SELECT on the events table. The row policy is
    // created before the grant so a failure leaves the user with no access.
    `REVOKE ALL ON *.* FROM ${user}`,
    `CREATE ROW POLICY OR REPLACE ${user}_site_scope ON ${database}.events FOR SELECT USING has(JSONExtract(getClientHTTPHeader('${SITE_SCOPE_HEADER}'), 'Array(UInt16)'), site_id) TO ${user}`,
    // A row policy hides every row from users it doesn't cover when the server
    // runs with users_without_row_policies_can_read_rows=false; keep the main
    // user (and any other) unrestricted regardless of that setting.
    `CREATE ROW POLICY OR REPLACE ${user}_others_unrestricted ON ${database}.events FOR SELECT USING 1 TO ALL EXCEPT ${user}`,
    `GRANT SELECT ON ${database}.events TO ${user}`,
  ];
}

export async function provisionQueryUser() {
  const database = process.env.CLICKHOUSE_DB || "default";
  const password = process.env.CLICKHOUSE_QUERY_PASSWORD || process.env.CLICKHOUSE_PASSWORD || "";
  const user = CLICKHOUSE_QUERY_USER;

  try {
    for (const query of buildQueryUserStatements(database, user, password)) {
      await clickhouse.exec({ query });
    }
    logger.info({ user, database }, "ClickHouse query user provisioned");
  } catch (error) {
    logger.error(
      { err: error, user },
      `Could not provision ClickHouse user "${user}" (the main ClickHouse user needs access_management). Custom SQL queries and dashboards will fail until it exists with SELECT on ${database}.events — see docs: self-hosting-advanced → Custom SQL queries`
    );
  }

  try {
    const result = await clickhouseQuery.query({ query: "SELECT 1", format: "JSONEachRow" });
    await result.json();
  } catch (error) {
    logger.error(
      { err: error, user },
      `ClickHouse user "${user}" cannot connect; custom SQL queries and dashboards are unavailable (check CLICKHOUSE_QUERY_PASSWORD)`
    );
  }
}
