import { IS_CLOUD, LITE_DASHBOARD } from "../../lib/const.js";
import { initializeCloudTables } from "./schema/cloud.js";
import { initializeCoreTables } from "./schema/core.js";
import { initializeLiteDashboardMVs } from "./schema/liteDashboard.js";

export { clickhouse } from "./client.js";

export const initializeClickhouse = async () => {
  await initializeCoreTables();

  if (IS_CLOUD) {
    await initializeCloudTables();
  }

  if (LITE_DASHBOARD) {
    await initializeLiteDashboardMVs();
  }
};
