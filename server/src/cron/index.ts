import * as cron from "node-cron";
import { cleanupOldSessions } from "../db/postgres/session-cleanup.js";
import { IS_CLOUD } from "../lib/const.js";
import { updateUsersMonthlyUsage } from "./monthly-usage-checker.js";

export async function initializeCronJobs() {
  console.log("Initializing cron jobs...");

  if (IS_CLOUD) {
    // Schedule the monthly usage checker to run every 5 minutes
    cron.schedule("*/5 * * * *", updateUsersMonthlyUsage);
    updateUsersMonthlyUsage();
  }
  cron.schedule("*/60 * * * * *", cleanupOldSessions);

  console.log("Cron jobs initialized successfully");
}
