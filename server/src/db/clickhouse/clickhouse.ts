import { IS_CLOUD, LITE_DASHBOARD } from "../../lib/const.js";
import { clickhouseInitLogger, getServerTimezone } from "./initUtils.js";
import { initializeCloudTables } from "./schema/cloud.js";
import { initializeCoreTables } from "./schema/core.js";
import { initializeLiteDashboardMVs } from "./schema/liteDashboard.js";
import { provisionQueryUser } from "./queryUser.js";

export { clickhouse, clickhouseQuery } from "./client.js";

export const initializeClickhouse = async () => {
  // Every column is declared in UTC and every writer sends explicit-UTC
  // instants, so the server timezone no longer changes what is stored. It
  // still shows up in ad-hoc SQL and in bug reports, so say so once at boot.
  const timezone = await getServerTimezone();
  if (timezone !== "UTC") {
    clickhouseInitLogger.warn(
      { timezone },
      "ClickHouse server timezone is not UTC; Rybbit stores and queries UTC explicitly, but set <timezone>UTC</timezone> to keep ad-hoc SQL unambiguous"
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
