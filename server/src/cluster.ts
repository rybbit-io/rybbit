import cluster from "node:cluster";
import os from "node:os";
import { initializeClickhouse } from "./db/clickhouse/clickhouse.js";
import { initPostgres } from "./db/postgres/initPostgres.js";
import { IS_CLOUD } from "./lib/const.js";
import { createServiceLogger } from "./lib/logger/logger.js";
import { reengagementService } from "./services/reengagement/reengagementService.js";
import { sessionsService } from "./services/sessions/sessionsService.js";
import { telemetryService } from "./services/telemetryService.js";
import { usageService } from "./services/usageService.js";
import { weeklyReportService } from "./services/weekyReports/weeklyReportService.js";

const logger = createServiceLogger("cluster");

// Determine worker count from environment variable
// Default to 0 (single-process mode) if not set. Max 4 workers.
const MAX_WORKERS = 4;
const requestedWorkers = process.env.CLUSTER_WORKERS;
const workerCount =
  requestedWorkers === undefined || requestedWorkers === ""
    ? 0
    : Math.min(parseInt(requestedWorkers, 10), MAX_WORKERS);

if (workerCount === 0) {
  // Single-process mode — no clustering, same as running index.ts directly
  logger.info("CLUSTER_WORKERS=0, running in single-process mode");
  import("./index.js");
} else if (cluster.isPrimary) {
  logger.info(`Primary process ${process.pid} starting with ${workerCount} workers`);

  // Initialize databases once before forking workers
  await Promise.all([initializeClickhouse(), initPostgres()]);
  logger.info("Database initialization complete");

  // Start cron jobs on the primary process only
  telemetryService.startTelemetryCron();
  if (IS_CLOUD && process.env.NODE_ENV !== "development") {
    weeklyReportService.startWeeklyReportCron();
    reengagementService.startReengagementCron();
  }

  // usageService and sessionsService crons are auto-started in constructors
  // (guarded by !cluster.isWorker), so importing them above is sufficient.
  // importQuotaManager cleanup interval is also guarded.

  // Monkey-patch updateOrganizationsMonthlyUsage to broadcast sitesOverLimit after each run
  const originalUpdate = usageService.updateOrganizationsMonthlyUsage.bind(usageService);
  usageService.updateOrganizationsMonthlyUsage = async () => {
    await originalUpdate();
    broadcastSitesOverLimit();
  };

  // Fork workers
  let isShuttingDown = false;

  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  // Send current sitesOverLimit to a worker when it comes online
  cluster.on("online", (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
    const siteIds = Array.from(usageService.getSitesOverLimit());
    worker.send({ type: "sites-over-limit", siteIds });
  });

  // Auto-restart crashed workers (unless shutting down)
  cluster.on("exit", (worker, code, signal) => {
    if (isShuttingDown) {
      logger.info(`Worker ${worker.process.pid} exited during shutdown`);
      return;
    }
    logger.warn(
      `Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`
    );
    cluster.fork();
  });

  /**
   * Broadcast the current sitesOverLimit set to all alive workers via IPC
   */
  function broadcastSitesOverLimit() {
    const siteIds = Array.from(usageService.getSitesOverLimit());
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker && !worker.isDead()) {
        worker.send({ type: "sites-over-limit", siteIds });
      }
    }
    logger.debug(`Broadcasted ${siteIds.length} sites-over-limit to workers`);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`${signal} received during shutdown, forcing exit...`);
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);

    // Force exit timeout
    const forceExitTimeout = setTimeout(() => {
      logger.error("Shutdown timeout exceeded, forcing exit...");
      process.exit(1);
    }, 30000);

    // Stop cron jobs
    usageService.stopUsageCheckCron();
    sessionsService.stopCleanupCron();
    telemetryService.stopTelemetryCron();
    if (IS_CLOUD) {
      weeklyReportService.stopWeeklyReportCron();
      reengagementService.stopReengagementCron();
    }

    // Signal all workers to shut down
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker && !worker.isDead()) {
        worker.process.kill("SIGTERM");
      }
    }

    // Wait for all workers to exit
    const workerExitPromises = Object.values(cluster.workers ?? {})
      .filter((w): w is NonNullable<typeof w> => w != null && !w.isDead())
      .map(
        (worker) =>
          new Promise<void>((resolve) => {
            worker.on("exit", () => resolve());
          })
      );

    await Promise.all(workerExitPromises);
    logger.info("All workers exited");

    clearTimeout(forceExitTimeout);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
} else {
  // Worker process — start the HTTP server
  import("./index.js");
}
