import cluster from "node:cluster";
import { initializeClickhouse } from "./db/clickhouse/clickhouse.js";
import { initPostgres } from "./db/postgres/initPostgres.js";
import { IS_CLOUD } from "./lib/const.js";
import { createServiceLogger } from "./lib/logger/logger.js";
import { lifecycleEmailService } from "./services/lifecycleEmails/lifecycleEmailService.js";
import { sessionsService } from "./services/sessions/sessionsService.js";
import { telemetryService } from "./services/telemetryService.js";
import { unclaimedSiteCleanupService } from "./services/sites/unclaimedSiteCleanupService.js";
import {
  REFRESH_ORGANIZATION_USAGE_MESSAGE,
  USAGE_STATE_REQUEST_MESSAGE,
  usageService,
} from "./services/usageService.js";
import { weeklyReportService } from "./services/weekyReports/weeklyReportService.js";

const logger = createServiceLogger("cluster");

process.on("uncaughtException", error => {
  logger.error({ err: error }, "Uncaught exception in cluster process");
  process.exit(1);
});

process.on("unhandledRejection", reason => {
  logger.error({ err: reason }, "Unhandled rejection in cluster process");
  process.exit(1);
});

// Determine worker count from environment variable
// Default to 0 (single-process mode) if not set
const requestedWorkers = process.env.CLUSTER_WORKERS;
const workerCount = requestedWorkers === undefined || requestedWorkers === "" ? 0 : parseInt(requestedWorkers, 10);

if (workerCount === 0) {
  // Single-process mode — no clustering, same as running index.ts directly
  logger.info("CLUSTER_WORKERS=0, running in single-process mode");
  import("./index.js");
} else if (cluster.isPrimary) {
  logger.info(`Primary process ${process.pid} starting with ${workerCount} workers`);

  // Initialize databases once before forking workers
  try {
    await Promise.all([initializeClickhouse(), initPostgres()]);
    logger.info("Database initialization complete");
  } catch (error) {
    logger.error({ err: error }, "Primary process failed during database initialization");
    process.exit(1);
  }

  // Start cron jobs on the primary process only
  telemetryService.startTelemetryCron();
  usageService.startUsageCheckCron();
  unclaimedSiteCleanupService.startCleanupCron();
  if (IS_CLOUD && process.env.NODE_ENV !== "development") {
    weeklyReportService.startWeeklyReportCron();
    lifecycleEmailService.startLifecycleCron();
  }

  // Broadcast usage state (sitesOverLimit + sitesWithoutReplay) to workers after each usage update
  usageService.onUsageUpdated(() => {
    broadcastUsageState();
  });

  // Fork workers
  let isShuttingDown = false;

  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker, message: { type?: string; organizationId?: unknown }) => {
    // Workers ask the primary to re-evaluate an organization's blocked sites when a trial
    // starts or a site is added, so the change reaches every worker without waiting for the cron
    if (message?.type === REFRESH_ORGANIZATION_USAGE_MESSAGE && typeof message.organizationId === "string") {
      void usageService.refreshOrganizationWithRetry(message.organizationId);
    }
    // A starting worker asks for the current usage state once its listener is installed and
    // waits for it before serving. Sending on "online" instead raced the worker's module
    // loading, and a message that arrives before the listener exists is dropped.
    if (message?.type === USAGE_STATE_REQUEST_MESSAGE && worker.isConnected()) {
      worker.send(usageService.getUsageStateMessage());
    }
  });

  cluster.on("online", worker => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });

  // Auto-restart crashed workers (unless shutting down)
  cluster.on("exit", (worker, code, signal) => {
    if (isShuttingDown) {
      logger.info(`Worker ${worker.process.pid} exited during shutdown`);
      return;
    }
    logger.warn(`Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`);
    cluster.fork();
  });

  /**
   * Broadcast the current sitesOverLimit, sitesWithoutPlan and sitesWithoutReplay sets to all alive workers via IPC
   */
  function broadcastUsageState() {
    const message = usageService.getUsageStateMessage();
    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker && !worker.isDead()) {
        worker.send(message);
      }
    }
    logger.debug(
      `Broadcasted ${message.sitesOverLimit.length} sites-over-limit, ${message.sitesWithoutPlan.length} sites-without-plan and ${message.sitesWithoutReplay.length} sites-without-replay to workers`
    );
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
    unclaimedSiteCleanupService.stopCleanupCron();
    void sessionsService.close();
    telemetryService.stopTelemetryCron();
    if (IS_CLOUD) {
      weeklyReportService.stopWeeklyReportCron();
      lifecycleEmailService.stopLifecycleCron();
    }

    // Attach exit listeners before sending SIGTERM to avoid a race where
    // a worker exits before the listener is registered (which would hang shutdown).
    const activeWorkers = Object.values(cluster.workers ?? {}).filter(
      (w): w is NonNullable<typeof w> => w != null && !w.isDead()
    );

    const workerExitPromises = activeWorkers.map(
      worker =>
        new Promise<void>(resolve => {
          worker.on("exit", () => resolve());
        })
    );

    // Now signal all workers to shut down
    for (const worker of activeWorkers) {
      worker.process.kill("SIGTERM");
    }

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
