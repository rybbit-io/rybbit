import { createHash } from "node:crypto";
import { isValidTimeZone } from "../../api/analytics/utils/timeWindow.js";

export function getRollupConfig() {
  const timeZones = [
    ...new Set([
      "UTC",
      ...(process.env.DASHBOARD_ROLLUP_TIME_ZONES || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean),
    ]),
  ].sort();
  if (timeZones.length > 8 || timeZones.some(zone => !isValidTimeZone(zone))) {
    throw new Error("DASHBOARD_ROLLUP_TIME_ZONES must contain at most 8 valid timezones (including UTC)");
  }
  // A changed definition gets new storage, so a partially populated replacement
  // can never be mistaken for the previously validated snapshot.
  const version = createHash("sha256")
    .update(JSON.stringify([2, timeZones]))
    .digest("hex")
    .slice(0, 12);
  const table = `dashboard_sessions_v2_${version}`;
  return { timeZones, table, view: `${table}_refresh` };
}
export type RollupConfig = ReturnType<typeof getRollupConfig>;
