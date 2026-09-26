import { IS_CLOUD, LITE_DASHBOARD } from "../../lib/const.js";
import { clickhouse } from "./client.js";
import { clickhouseInitLogger } from "./initUtils.js";
import { initializeCloudTables } from "./schema/cloud.js";
import { initializeCoreTables } from "./schema/core.js";
import { initializeLiteDashboardMVs } from "./schema/liteDashboard.js";
import { provisionQueryUser } from "./queryUser.js";

export { clickhouse, clickhouseQuery } from "./client.js";

export const initializeClickhouse = async () => {
  // Every column is declared in UTC and every writer sends explicit-UTC
  // instants, so the server timezone no longer changes what is stored. It
  // still shows up in ad-hoc SQL, and installs upgraded from a non-UTC server
  // have month partitions to rebuild, so say so once at boot.
  const result = await clickhouse.query({ query: "SELECT timezone() AS timezone", format: "JSONEachRow" });
  const timezone = (await result.json<{ timezone: string }>())[0]?.timezone ?? "UTC";
  if (timezone !== "UTC") {
    clickhouseInitLogger.warn(
      { timezone },
      "ClickHouse server timezone is not UTC; Rybbit stores and queries UTC explicitly, but set <timezone>UTC</timezone> " +
        "to keep ad-hoc SQL unambiguous. If this install ran before its columns were pinned to UTC, see docs: self-hosting-advanced → ClickHouse timezone"
    );
  }

  await initializeCoreTables();

  if (IS_CLOUD) {
    await initializeCloudTables();
  }

  if (LITE_DASHBOARD) {
    await initializeLiteDashboardMVs();
  }

  await provisionQueryUser();
};
