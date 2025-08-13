import { MonitorScheduler } from "./monitorScheduler.js";
import { MonitorExecutor } from "./monitorExecutor.js";
import { RegionHealthChecker } from "./regionHealthChecker.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

class UptimeService {
  private scheduler: MonitorScheduler;
  private executor: MonitorExecutor;
  private regionHealthChecker: RegionHealthChecker;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private logger = createServiceLogger("uptime");

  constructor() {
    this.scheduler = new MonitorScheduler();
    this.executor = new MonitorExecutor(10); // 10 concurrent workers
    this.regionHealthChecker = new RegionHealthChecker(60000); // Check every minute
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug("Uptime service already initialized");
      return;
    }

    // If already initializing, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create and store the initialization promise
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      this.logger.info("Initializing BullMQ uptime monitoring service...");

      // Initialize scheduler (creates queue, loads and schedules all monitors)
      await this.scheduler.initialize();

      // Start executor (begins processing jobs)
      await this.executor.start();

      // Start region health checker
      await this.regionHealthChecker.start();

      this.initialized = true;
      this.logger.info("BullMQ uptime monitoring service initialized successfully");
    } catch (error) {
      this.logger.error(error, "Failed to initialize uptime service");
      this.initializationPromise = null; // Reset on failure
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down BullMQ uptime monitoring service...");

    try {
      // Stop region health checker
      await this.regionHealthChecker.stop();

      // Shutdown executor first (stops processing new jobs)
      await this.executor.shutdown();

      // Then shutdown scheduler (closes queue)
      await this.scheduler.shutdown();

      this.initialized = false;
      this.logger.info("BullMQ uptime monitoring service shut down successfully");
    } catch (error) {
      this.logger.error(error, "Error during uptime service shutdown");
    }
  }

  // Methods for managing monitors after CRUD operations
  async onMonitorCreated(monitorId: number, intervalSeconds: number): Promise<void> {
    // Wait for initialization if it's in progress
    if (!this.initialized && this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.initialized) {
      this.logger.warn("Uptime service not initialized, cannot schedule monitor");
      return;
    }

    // Schedule the monitor for recurring checks
    await this.scheduler.scheduleMonitor(monitorId, intervalSeconds);

    // Trigger an immediate check
    await this.scheduler.triggerImmediateCheck(monitorId);
  }

  async onMonitorUpdated(monitorId: number, intervalSeconds: number, enabled: boolean): Promise<void> {
    // Wait for initialization if it's in progress
    if (!this.initialized && this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.initialized) {
      this.logger.warn("Uptime service not initialized, cannot update monitor");
      return;
    }

    if (enabled) {
      await this.scheduler.updateMonitorSchedule(monitorId, intervalSeconds);
      // Trigger immediate check when monitor is re-enabled
      await this.scheduler.triggerImmediateCheck(monitorId);
    } else {
      await this.scheduler.removeMonitorSchedule(monitorId);
    }
  }

  async onMonitorDeleted(monitorId: number): Promise<void> {
    // Wait for initialization if it's in progress
    if (!this.initialized && this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.initialized) {
      this.logger.warn("Uptime service not initialized, cannot delete monitor");
      return;
    }

    await this.scheduler.removeMonitorSchedule(monitorId);
  }
}

// Export singleton instance
export const uptimeService = new UptimeService();
