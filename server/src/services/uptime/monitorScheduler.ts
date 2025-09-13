import { Queue, QueueEvents } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { MonitorCheckJob } from "./types.js";

export class MonitorScheduler {
  private queue: Queue;
  private queueEvents: QueueEvents;
  private isShuttingDown = false;
  private connection: { host: string; port: number; password?: string };
  private logger = createServiceLogger("monitor-scheduler");

  constructor() {
    // Get Redis connection from environment
    this.connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    };

    this.logger.info({ host: this.connection.host, port: this.connection.port }, "BullMQ connecting to Redis");

    this.queue = new Queue("monitor-checks", {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 3600, // Keep for 1 hour
        },
        removeOnFail: {
          count: 100, // Keep last 100 failed jobs
          age: 86400, // Keep for 24 hours
        },
      },
    });

    this.queueEvents = new QueueEvents("monitor-checks", {
      connection: this.connection,
    });
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing BullMQ monitor scheduler...");

    // Wait for queue to be ready
    await this.queue.waitUntilReady();
    await this.queueEvents.waitUntilReady();

    this.logger.info("BullMQ queue ready");

    // Clear any stale jobs from previous runs
    await this.clearStaleJobs();

    // Load and schedule all active monitors
    await this.loadAndScheduleMonitors();

    this.logger.info("BullMQ monitor scheduler initialized");
  }

  private async clearStaleJobs(): Promise<void> {
    try {
      // For Dragonfly compatibility, we'll clear jobs more carefully
      // First, try to get counts to see if there are any jobs
      const counts = await this.queue.getJobCounts();
      this.logger.debug({ counts }, "Current job counts");

      // Only try to clear if there are actually jobs
      if (counts.delayed > 0 || counts.waiting > 0 || counts.active > 0) {
        try {
          // Try to clean specific job types one by one
          const waitingJobs = await this.queue.getJobs(["waiting"]);
          const activeJobs = await this.queue.getJobs(["active"]);

          this.logger.debug({ waitingJobs: waitingJobs.length, activeJobs: activeJobs.length }, "Found stale jobs");

          // Remove jobs individually
          for (const job of [...waitingJobs, ...activeJobs]) {
            try {
              await job.remove();
            } catch (err) {
              this.logger.warn({ jobId: job.id, error: err }, "Failed to remove job");
            }
          }

          this.logger.info("Cleared stale jobs");
        } catch (err) {
          this.logger.warn({ error: err }, "Could not clear all job types");
        }
      } else {
        this.logger.debug("No stale jobs to clear");
      }
    } catch (error) {
      this.logger.error(error, "Error clearing stale jobs");
      // Continue anyway - this is not critical for startup
    }
  }

  private async loadAndScheduleMonitors(): Promise<void> {
    try {
      // Load all enabled monitors
      const monitors = await db.select().from(uptimeMonitors).where(eq(uptimeMonitors.enabled, true));

      this.logger.info({ monitorCount: monitors.length }, "Found enabled monitors");

      // Schedule each monitor
      for (const monitor of monitors) {
        await this.scheduleMonitor(monitor.id, monitor.intervalSeconds);
      }
    } catch (error) {
      this.logger.error(error, "Error loading monitors");
    }
  }

  async scheduleMonitor(monitorId: number, intervalSeconds: number): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      // Remove existing jobs for this monitor
      await this.removeMonitorSchedule(monitorId);

      const jobName = `monitor-${monitorId}`;
      const jobData: MonitorCheckJob = {
        monitorId,
        intervalSeconds,
      };

      // Add recurring job using repeat option
      const job = await this.queue.add(jobName, jobData, {
        repeat: {
          every: intervalSeconds * 1000, // Convert to milliseconds
        },
        jobId: jobName, // Use monitor ID as job ID to prevent duplicates
      });

      this.logger.info({ monitorId, intervalSeconds, jobId: job.id }, "Scheduled monitor");
    } catch (error) {
      this.logger.error({ monitorId, error }, "Error scheduling monitor");
    }
  }

  async removeMonitorSchedule(monitorId: number): Promise<void> {
    try {
      const jobName = `monitor-${monitorId}`;

      // First, remove repeatable job configuration
      const repeatableJobs = await this.queue.getRepeatableJobs();
      const monitorRepeatableJobs = repeatableJobs.filter((job) => job.name === jobName || job.id === jobName);

      await Promise.all(monitorRepeatableJobs.map((job) => this.queue.removeRepeatableByKey(job.key)));

      // Then remove any non-repeat jobs (only remove jobs that don't belong to scheduler)
      const jobs = await this.queue.getJobs(["waiting", "active", "completed", "failed"]);
      const monitorJobs = jobs.filter((job) => {
        // Only remove jobs that match our monitor and aren't repeat jobs
        return (job.name === jobName || job.id === jobName) && !job.repeatJobKey;
      });

      await Promise.all(
        monitorJobs.map(async (job) => {
          try {
            await job.remove();
          } catch (err) {
            // Ignore errors for jobs that can't be removed (e.g., repeat jobs)
            this.logger.warn({ jobId: job.id, error: err }, "Could not remove job");
          }
        }),
      );

      this.logger.info({ monitorId }, "Removed schedule for monitor");
    } catch (error) {
      this.logger.error({ monitorId, error }, "Error removing monitor schedule");
    }
  }

  async updateMonitorSchedule(monitorId: number, intervalSeconds: number): Promise<void> {
    await this.scheduleMonitor(monitorId, intervalSeconds);
  }

  async triggerImmediateCheck(monitorId: number): Promise<void> {
    try {
      const jobName = `monitor-${monitorId}-immediate`;
      const jobData: MonitorCheckJob = {
        monitorId,
        intervalSeconds: 0, // Not used for immediate checks
      };

      // Add a one-time job for immediate execution
      const job = await this.queue.add(jobName, jobData, {
        delay: 0, // No delay
        priority: 1, // Higher priority than regular checks
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.info({ monitorId, jobId: job.id }, "Triggered immediate check for monitor");
    } catch (error) {
      this.logger.error({ monitorId, error }, "Error triggering immediate check for monitor");
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down BullMQ monitor scheduler...");
    this.isShuttingDown = true;

    try {
      // Close queue events and queue with timeouts
      await Promise.all([
        Promise.race([
          this.queueEvents.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Queue events close timeout")), 3000)),
        ]).catch((err) => this.logger.error(err, "Queue events close error")),
        Promise.race([
          this.queue.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Queue close timeout")), 3000)),
        ]).catch((err) => this.logger.error(err, "Queue close error")),
      ]);

      this.logger.info("BullMQ monitor scheduler shut down successfully");
    } catch (error) {
      this.logger.error(error, "Error during scheduler shutdown");
    }
  }

  getQueue(): Queue {
    return this.queue;
  }
}
