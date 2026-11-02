import { randomBytes } from "node:crypto";
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
// A request without the header reads no rows. Custom SQL is refused until
// isQueryUserIsolated() confirms the policy is in place.
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const SITE_SCOPE_HEADER = "X-Rybbit-Site-Ids";

// Per-request headers for clickhouseQuery: the site ids the row policy admits.
export function siteScopeHeaders(siteIds: number[]): Record<string, string> {
  return { [SITE_SCOPE_HEADER]: JSON.stringify(siteIds) };
}

function quoteIdentifier(name: string) {
  return "`" + name.replace(/\\/g, "\\\\").replace(/`/g, "\\`") + "`";
}

export function siteScopePolicyName(user: string) {
  return `${user}_site_scope`;
}

export interface QueryUserStatements {
  // Profile and user; safe to run before anything else is known.
  setup: string[];
  // Grants exactly SELECT on events behind the site-scope row policy. The policy
  // is created before the grant, so a failure part-way leaves no access.
  access: string[];
}

export function buildQueryUserStatements(database: string, user: string, password: string): QueryUserStatements {
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

  return {
    setup: [
      `CREATE SETTINGS PROFILE IF NOT EXISTS ${profile}`,
      `ALTER SETTINGS PROFILE ${profile} SETTINGS ${profileSettings}`,
      `CREATE USER IF NOT EXISTS ${user} IDENTIFIED WITH sha256_password BY ${secret}`,
      // Re-assert the password and profile so an env change or a drifted user is corrected.
      `ALTER USER ${user} IDENTIFIED WITH sha256_password BY ${secret} SETTINGS PROFILE ${SqlString.escape(profile)}`,
    ],
    access: [
      `REVOKE ALL ON *.* FROM ${user}`,
      `CREATE ROW POLICY OR REPLACE ${siteScopePolicyName(user)} ON ${database}.events FOR SELECT USING has(JSONExtract(getClientHTTPHeader('${SITE_SCOPE_HEADER}'), 'Array(UInt16)'), site_id) TO ${user}`,
      `GRANT SELECT ON ${database}.events TO ${user}`,
    ],
  };
}

// With users_without_row_policies_can_read_rows=false (the default is true), a
// row policy on events would hide every row from users it doesn't name — the
// main connection included, blanking every dashboard. Check on a throwaway
// table rather than on events, so the probe itself can't blank anything.
async function rowPoliciesHideUnnamedUsers(database: string, user: string): Promise<boolean> {
  const table = `${database}.rybbit_row_policy_probe_${randomBytes(4).toString("hex")}`;
  const policy = `rybbit_row_policy_probe ON ${table}`;
  try {
    await clickhouse.exec({ query: `CREATE TABLE ${table} (x UInt8) ENGINE = Memory` });
    await clickhouse.exec({ query: `INSERT INTO ${table} VALUES (1)` });
    await clickhouse.exec({ query: `CREATE ROW POLICY ${policy} USING 0 TO ${user}` });
    const result = await clickhouse.query({ query: `SELECT count() AS c FROM ${table}`, format: "JSONEachRow" });
    const [row] = await result.json<{ c: string | number }>();
    return Number(row?.c) === 0;
  } finally {
    await clickhouse.exec({ query: `DROP ROW POLICY IF EXISTS ${policy}` }).catch(() => undefined);
    await clickhouse.exec({ query: `DROP TABLE IF EXISTS ${table}` }).catch(() => undefined);
  }
}

export async function provisionQueryUser() {
  const database = process.env.CLICKHOUSE_DB || "default";
  const password = process.env.CLICKHOUSE_QUERY_PASSWORD || process.env.CLICKHOUSE_PASSWORD || "";
  const user = CLICKHOUSE_QUERY_USER;

  try {
    const { setup, access } = buildQueryUserStatements(database, user, password);
    for (const query of setup) {
      await clickhouse.exec({ query });
    }
    // Roles carry their own row policies, which would OR with the site scope;
    // REVOKE ALL doesn't touch role grants, so drop them explicitly.
    const roles = await clickhouse
      .query({
        query: "SELECT granted_role_name AS role FROM system.role_grants WHERE user_name = {user:String}",
        query_params: { user },
        format: "JSONEachRow",
      })
      .then(result => result.json<{ role: string }>());
    for (const { role } of roles) {
      await clickhouse.exec({ query: `REVOKE ${quoteIdentifier(role)} FROM ${user}` });
    }
    if (await rowPoliciesHideUnnamedUsers(database, user)) {
      await clickhouse.exec({ query: `REVOKE ALL ON *.* FROM ${user}` });
      await clickhouse.exec({ query: `DROP ROW POLICY IF EXISTS ${siteScopePolicyName(user)} ON ${database}.events` });
      logger.error(
        { user },
        "ClickHouse hides rows from users without a row policy (access_control_improvements.users_without_row_policies_can_read_rows=false). Custom SQL queries and dashboards are disabled; set it to true and restart."
      );
      return;
    }
    for (const query of access) {
      await clickhouse.exec({ query });
    }
    logger.info({ user, database }, "ClickHouse query user provisioned");
  } catch (error) {
    logger.error(
      { err: error, user },
      `Could not provision ClickHouse user "${user}" (the main ClickHouse user needs access_management). Custom SQL queries and dashboards are disabled until it exists with SELECT on ${database}.events behind the ${siteScopePolicyName(user)} row policy`
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

export const QUERY_USER_UNAVAILABLE_ERROR =
  "Custom SQL is unavailable: the ClickHouse query user is not fully provisioned. Check the server logs.";

const ISOLATION_CHECK_TTL_MS = 60_000;
let isolationCheck: { at: number; result: Promise<boolean> } | null = null;

// Whether events reads by the query user are confined to the site-scope row
// policy: the policy exists, still keys on the scope header, and no other
// permissive policy on events reaches the user (permissive policies are ORed,
// so one would widen the scope), and the user holds no role, whose policies
// would apply too. Checked per process from system.row_policies,
// so it holds under CLUSTER_WORKERS (provisioning runs only on the primary),
// after a failed upgrade that left an older user's grant in place, and for a
// hand-provisioned user. Fails closed on any error.
export function isQueryUserIsolated(): Promise<boolean> {
  if (isolationCheck && Date.now() - isolationCheck.at < ISOLATION_CHECK_TTL_MS) {
    return isolationCheck.result;
  }
  const database = process.env.CLICKHOUSE_DB || "default";
  const user = CLICKHOUSE_QUERY_USER;
  const result = clickhouse
    .query({
      query: `
        SELECT
          countIf(short_name = {policy:String} AND NOT is_restrictive AND has(apply_to_list, {user:String})
            AND NOT apply_to_all AND position(ifNull(select_filter, ''), {header:String}) > 0) AS scoped,
          countIf(short_name != {policy:String} AND NOT is_restrictive
            AND (has(apply_to_list, {user:String}) OR (apply_to_all AND NOT has(apply_to_except, {user:String})))) AS widening,
          (SELECT count() FROM system.role_grants WHERE user_name = {user:String}) AS roles
        FROM system.row_policies
        WHERE database = {database:String} AND table = 'events'
      `,
      query_params: { policy: siteScopePolicyName(user), user, header: SITE_SCOPE_HEADER, database },
      format: "JSONEachRow",
    })
    .then(response => response.json<{ scoped: string | number; widening: string | number; roles: string | number }>())
    .then(([row]) => Number(row?.scoped) === 1 && Number(row?.widening) === 0 && Number(row?.roles) === 0)
    .catch(error => {
      logger.error({ err: error, user }, "Could not verify the ClickHouse query user's row policy");
      return false;
    });
  isolationCheck = { at: Date.now(), result };
  return result;
}
