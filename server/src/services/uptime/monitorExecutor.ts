import { Worker, Job } from "bullmq";
import { eq, and, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../../db/postgres/postgres.js";
import { uptimeMonitors, uptimeMonitorStatus, agentRegions, uptimeIncidents } from "../../db/postgres/schema.js";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { MonitorCheckJob, HttpCheckResult, TcpCheckResult, MonitorEvent } from "./types.js";
import { performHttpCheck } from "./checks/httpCheck.js";
import { performTcpCheck } from "./checks/tcpCheck.js";
import { applyValidationRules } from "./validationEngine.js";
import { NotificationService } from "./notificationService.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

interface AgentExecuteRequest {
  jobId: string;
  monitorId: number;
  monitorType: string;
  config: any;
  validationRules: any[];
}

interface AgentExecuteResponse {
  jobId: string;
  region: string;
  status: "success" | "failure" | "timeout";
  responseTimeMs: number;
  statusCode?: number;
  headers?: Record<string, string>;
  timing?: {
    dnsMs?: number;
    tcpMs?: number;
    tlsMs?: number;
    ttfbMs?: number;
    transferMs?: number;
  };
  error?: {
    message: string;
    type: string;
  };
  validationErrors?: string[];
  bodySizeBytes?: number;
}

export class MonitorExecutor {
  private worker: Worker | null = null;
  private concurrency: number;
  private isShuttingDown = false;
  private connection: { host: string; port: number; password?: string };
  private notificationService: NotificationService;
  private logger = createServiceLogger("monitor-executor");

  // Confirmation thresholds - require multiple consecutive checks before triggering incidents
  private static readonly FAILURE_THRESHOLD = 2; // Consecutive failures before creating incident
  private static readonly SUCCESS_THRESHOLD = 2; // Consecutive successes before resolving incident

  constructor(concurrency: number = 10) {
    this.concurrency = concurrency;
    this.connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    };
    this.notificationService = new NotificationService();
  }

  async start(): Promise<void> {
    this.logger.info(`Starting BullMQ monitor executor with concurrency: ${this.concurrency}`);

    // Create worker to process jobs
    this.worker = new Worker(
      "monitor-checks",
      async (job: Job<MonitorCheckJob>) => {
        await this.processMonitorCheck(job.data);
      },
      {
        connection: this.connection,
        concurrency: this.concurrency,
        autorun: true,
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 100,
        },
      },
    );

    // Set up event listeners
    // this.worker.on("completed", (job) => {
    //   this.logger.debug(`Job ${job.id} completed successfully`);
    // });

    this.worker.on("failed", (job, err) => {
      this.logger.error(err as Error, `Job ${job?.id} failed`);
    });

    this.worker.on("error", (err) => {
      this.logger.error(err as Error, "Worker error");
    });

    this.worker.on("ready", () => {
      this.logger.info("BullMQ worker is ready and listening for jobs");
    });

    // this.worker.on("active", (job) => {
    //   this.logger.debug(`Job ${job.id} is now active`);
    // });

    // Wait for worker to be ready
    await new Promise<void>((resolve) => {
      if (this.worker) {
        this.worker.once("ready", () => {
          resolve();
        });
      }
    });

    this.logger.info("BullMQ monitor executor started successfully");
  }

  private async processMonitorCheck(jobData: MonitorCheckJob): Promise<void> {
    const { monitorId } = jobData;

    try {
      this.logger.debug(`🔍 Starting to process monitor check for monitor ID: ${monitorId}`);

      // Fetch monitor configuration
      const monitor = await db.query.uptimeMonitors.findFirst({
        where: eq(uptimeMonitors.id, monitorId),
      });

      if (!monitor || !monitor.enabled) {
        this.logger.debug(`Monitor ${monitorId} not found or disabled`);
        return;
      }

      // Check if this is a global monitor
      if (monitor.monitoringType === "global" && monitor.selectedRegions && monitor.selectedRegions.length > 0) {
        await this.processGlobalMonitorCheck(monitor);
        return;
      }

      // For local monitoring, proceed with the original logic
      let result: HttpCheckResult | TcpCheckResult;
      let responseBody: string | undefined;

      if (monitor.monitorType === "http" && monitor.httpConfig) {
        const httpResult = await performHttpCheck({
          url: monitor.httpConfig.url,
          method: monitor.httpConfig.method || "GET",
          headers: monitor.httpConfig.headers,
          body: monitor.httpConfig.body,
          auth: monitor.httpConfig.auth,
          followRedirects: monitor.httpConfig.followRedirects !== false,
          timeoutMs: monitor.httpConfig.timeoutMs,
          ipVersion: monitor.httpConfig.ipVersion,
          userAgent: monitor.httpConfig.userAgent,
        });

        result = httpResult;

        // For HTTP checks, we might need the response body for validation
        // Note: In production, you might want to limit body size or make this optional
        if (httpResult.status === "success" && monitor.validationRules.length > 0) {
          // For now, we'll skip body validation to avoid memory issues
          // In a real implementation, you'd stream the body or limit size
          responseBody = undefined;
        }
      } else if (monitor.monitorType === "tcp" && monitor.tcpConfig) {
        result = await performTcpCheck({
          host: monitor.tcpConfig.host,
          port: monitor.tcpConfig.port,
          timeoutMs: monitor.tcpConfig.timeoutMs,
        });
      } else {
        throw new Error(`Invalid monitor configuration for monitor ${monitorId}`);
      }

      // Apply validation rules for successful checks
      if (result.status === "success" && monitor.validationRules.length > 0) {
        const validationErrors = applyValidationRules(result as HttpCheckResult, monitor.validationRules, responseBody);

        if (validationErrors.length > 0) {
          result.validationErrors = validationErrors;
          // Change status to failure if validation fails
          result.status = "failure";
        }
      }

      // Store result in ClickHouse
      await this.storeMonitorEvent(monitor, result);

      // Update monitor status in PostgreSQL
      await this.updateMonitorStatus(monitor.id, result);

      this.logger.info(`✅ Monitor check completed: ${monitorId} - ${result.status} (${result.responseTimeMs}ms`);
    } catch (error) {
      this.logger.error(error as Error, `Error processing monitor check ${monitorId}`);

      // Try to store the error event
      try {
        const monitor = await db.query.uptimeMonitors.findFirst({
          where: eq(uptimeMonitors.id, monitorId),
        });

        if (monitor) {
          const errorResult: HttpCheckResult = {
            status: "failure",
            responseTimeMs: 0,
            timing: {},
            headers: {},
            bodySizeBytes: 0,
            validationErrors: [],
            error: {
              message: error instanceof Error ? error.message : "Internal error during monitor check",
              type: "internal_error",
            },
          };

          await this.storeMonitorEvent(monitor, errorResult);
          await this.updateMonitorStatus(monitor.id, errorResult);
        }
      } catch (innerError) {
        this.logger.error(innerError as Error, "Failed to store error event");
      }
    }
  }

  private async processGlobalMonitorCheck(monitor: any): Promise<void> {
    try {
      // Filter to only include non-local regions
      const globalRegions = monitor.selectedRegions.filter((r: string) => r !== "local");

      if (globalRegions.length === 0) {
        this.logger.debug(`Monitor ${monitor.id} has no global regions selected`);
        return;
      }

      // Fetch agent regions information
      const regions = await db.query.agentRegions.findMany({
        where: and(
          inArray(agentRegions.code, globalRegions),
          eq(agentRegions.enabled, true),
          eq(agentRegions.isHealthy, true),
        ),
      });

      if (regions.length === 0) {
        this.logger.warn(`No healthy regions found for monitor ${monitor.id}`);
        return;
      }

      // Execute checks in parallel across all regions
      const regionPromises = regions.map((region) =>
        this.executeAgentCheck(monitor, region).catch((error) => {
          this.logger.error(error as Error, `Error executing check in region ${region.code}`);
          return {
            region: region.code,
            result: {
              status: "failure" as const,
              responseTimeMs: 0,
              timing: {},
              headers: {},
              bodySizeBytes: 0,
              validationErrors: [],
              error: {
                message: error instanceof Error ? error.message : "Agent communication error",
                type: "agent_error",
              },
            } as HttpCheckResult,
          };
        }),
      );

      const regionResults = await Promise.all(regionPromises);

      // Store results for each region
      for (const { region, result } of regionResults) {
        await this.storeMonitorEvent(monitor, result, region);
      }

      // Handle incidents per region with thresholds
      for (const { region, result } of regionResults) {
        await this.handleRegionalIncident(monitor, region, result);
      }

      // Update monitor status based on the majority of regions
      const successCount = regionResults.filter((r) => r.result.status === "success").length;
      const overallStatus = successCount > regionResults.length / 2 ? "success" : "failure";

      // Use the average response time from successful checks
      const successfulResults = regionResults.filter((r) => r.result.status === "success");
      const avgResponseTime =
        successfulResults.length > 0
          ? successfulResults.reduce((sum, r) => sum + r.result.responseTimeMs, 0) / successfulResults.length
          : 0;

      const aggregatedResult: HttpCheckResult = {
        status: overallStatus === "success" ? "success" : "failure",
        responseTimeMs: avgResponseTime,
        timing: {},
        headers: {},
        bodySizeBytes: 0,
        validationErrors: [],
      };

      await this.updateMonitorStatus(monitor.id, aggregatedResult);

      this.logger.info(
        `✅ Global monitor check completed: ${monitor.id} - ${overallStatus} (${regionResults.length} regions)`,
      );
    } catch (error) {
      this.logger.error(error as Error, `Error processing global monitor check ${monitor.id}`);
    }
  }

  private async executeAgentCheck(
    monitor: any,
    region: any,
  ): Promise<{ region: string; result: HttpCheckResult | TcpCheckResult }> {
    const jobId = `${monitor.id}-${Date.now()}-${region.code}`;

    const request: AgentExecuteRequest = {
      jobId,
      monitorId: monitor.id,
      monitorType: monitor.monitorType,
      config: monitor.monitorType === "http" ? monitor.httpConfig : monitor.tcpConfig,
      validationRules: monitor.validationRules || [],
    };

    try {
      const response = await fetch(`${region.endpointUrl}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        throw new Error(`Agent returned status ${response.status}`);
      }

      const agentResponse: AgentExecuteResponse = await response.json();

      // Convert agent response to our internal format
      const result: HttpCheckResult | TcpCheckResult =
        monitor.monitorType === "http"
          ? {
              status: agentResponse.status,
              statusCode: agentResponse.statusCode,
              responseTimeMs: agentResponse.responseTimeMs,
              timing: agentResponse.timing || {},
              headers: agentResponse.headers || {},
              bodySizeBytes: agentResponse.bodySizeBytes || 0,
              validationErrors: agentResponse.validationErrors || [],
              error: agentResponse.error,
            }
          : {
              status: agentResponse.status,
              responseTimeMs: agentResponse.responseTimeMs,
              validationErrors: [],
              error: agentResponse.error,
            };

      return { region: region.code, result };
    } catch (error) {
      this.logger.error(error as Error, `Failed to execute check via agent ${region.code}`);
      throw error;
    }
  }

  private async storeMonitorEvent(
    monitor: any,
    result: HttpCheckResult | TcpCheckResult,
    regionCode: string = "local",
  ): Promise<void> {
    // Helper to ensure timing values are non-negative or undefined
    const sanitizeTiming = (value: number | undefined): number | undefined => {
      if (value === undefined || value === null) return undefined;
      return value >= 0 ? Math.round(value) : undefined;
    };

    const event: MonitorEvent = {
      monitor_id: monitor.id,
      organization_id: monitor.organizationId,
      timestamp: DateTime.now().toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
      monitor_type: monitor.monitorType,
      monitor_url: monitor.httpConfig?.url || `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`,
      monitor_name: monitor.name,
      region: regionCode,
      status: result.status,
      status_code: (result as HttpCheckResult).statusCode,
      response_time_ms: Math.max(0, Math.round(result.responseTimeMs)),
      dns_time_ms: sanitizeTiming((result as HttpCheckResult).timing?.dnsMs),
      tcp_time_ms: sanitizeTiming((result as HttpCheckResult).timing?.tcpMs),
      tls_time_ms: sanitizeTiming((result as HttpCheckResult).timing?.tlsMs),
      ttfb_ms: sanitizeTiming((result as HttpCheckResult).timing?.ttfbMs),
      transfer_time_ms: sanitizeTiming((result as HttpCheckResult).timing?.transferMs),
      validation_errors: result.validationErrors,
      response_headers: (result as HttpCheckResult).headers || {},
      response_size_bytes: (result as HttpCheckResult).bodySizeBytes,
      port: monitor.tcpConfig?.port,
      error_message: result.error?.message,
      error_type: result.error?.type,
    };

    try {
      await clickhouse.insert({
        table: "monitor_events",
        values: [event],
        format: "JSONEachRow",
      });
    } catch (error) {
      this.logger.error(error as Error, "Failed to store monitor event in ClickHouse");
    }
  }

  private async updateMonitorStatus(monitorId: number, result: HttpCheckResult | TcpCheckResult): Promise<void> {
    try {
      const now = new Date();
      const currentStatus = result.status === "success" ? "up" : "down";

      // Get current status to update consecutive counts
      const existingStatus = await db.query.uptimeMonitorStatus.findFirst({
        where: eq(uptimeMonitorStatus.monitorId, monitorId),
      });

      let consecutiveFailures = existingStatus?.consecutiveFailures || 0;
      let consecutiveSuccesses = existingStatus?.consecutiveSuccesses || 0;
      const previousStatus = existingStatus?.currentStatus;

      if (currentStatus === "up") {
        consecutiveSuccesses++;
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
        consecutiveSuccesses = 0;
      }

      // Update or insert status
      if (existingStatus) {
        await db
          .update(uptimeMonitorStatus)
          .set({
            lastCheckedAt: now.toISOString(),
            currentStatus,
            consecutiveFailures,
            consecutiveSuccesses,
            updatedAt: now.toISOString(),
          })
          .where(eq(uptimeMonitorStatus.monitorId, monitorId));
      } else {
        await db.insert(uptimeMonitorStatus).values({
          monitorId,
          lastCheckedAt: now.toISOString(),
          currentStatus,
          consecutiveFailures,
          consecutiveSuccesses,
          updatedAt: now.toISOString(),
        });
      }

      // Handle incident creation/resolution based on consecutive failures/successes
      await this.handleIncidentManagement(
        monitorId,
        previousStatus || undefined,
        currentStatus,
        result,
        consecutiveFailures,
        consecutiveSuccesses,
      );
    } catch (error) {
      this.logger.error(error as Error, "Failed to update monitor status");
    }
  }

  private async handleIncidentManagement(
    monitorId: number,
    previousStatus: string | undefined,
    currentStatus: string,
    result: HttpCheckResult | TcpCheckResult,
    consecutiveFailures: number,
    consecutiveSuccesses: number,
  ): Promise<void> {
    try {
      // Get monitor details for incident creation
      const monitor = await db.query.uptimeMonitors.findFirst({
        where: eq(uptimeMonitors.id, monitorId),
      });

      if (!monitor) {
        this.logger.error(`Monitor ${monitorId} not found for incident management`);
        return;
      }

      // Check for active incidents
      const activeIncident = await db.query.uptimeIncidents.findFirst({
        where: and(
          eq(uptimeIncidents.monitorId, monitorId),
          eq(uptimeIncidents.status, "active"),
          eq(uptimeIncidents.region, "local"),
        ),
      });

      // Create incident when failures reach threshold
      if (currentStatus === "down" && consecutiveFailures === MonitorExecutor.FAILURE_THRESHOLD && !activeIncident) {
        const [newIncident] = await db
          .insert(uptimeIncidents)
          .values({
            organizationId: monitor.organizationId as string,
            monitorId: monitorId,
            region: "local",
            startTime: new Date().toISOString(),
            status: "active",
            lastError: result.error?.message || null,
            lastErrorType: result.error?.type || null,
            failureCount: 1,
          })
          .returning();
        this.logger.info(`Created new incident for monitor ${monitorId} (${monitor.name})`);

        // Send notifications for new incident
        await this.notificationService.sendIncidentNotifications(monitor, newIncident, "down");
      }
      // Resolve incident when successes reach threshold after being down
      else if (currentStatus === "up" && consecutiveSuccesses === MonitorExecutor.SUCCESS_THRESHOLD && activeIncident) {
        const now = new Date().toISOString();
        await db
          .update(uptimeIncidents)
          .set({
            status: "resolved",
            endTime: now,
            resolvedAt: now,
          })
          .where(eq(uptimeIncidents.id, activeIncident.id));
        this.logger.info(`Resolved incident ${activeIncident.id} for monitor ${monitorId} (${monitor.name})`);

        // Send recovery notifications
        await this.notificationService.sendIncidentNotifications(
          monitor,
          { ...activeIncident, status: "resolved", endTime: now },
          "recovery",
        );
      }
      // Status remains DOWN (Update failure count)
      else if (currentStatus === "down" && activeIncident) {
        await db
          .update(uptimeIncidents)
          .set({
            failureCount: (activeIncident.failureCount || 0) + 1,
            lastError: result.error?.message || activeIncident.lastError,
            lastErrorType: result.error?.type || activeIncident.lastErrorType,
          })
          .where(eq(uptimeIncidents.id, activeIncident.id));
      }
    } catch (error) {
      this.logger.error(error as Error, "Failed to manage incident");
    }
  }

  private async handleRegionalIncident(
    monitor: any,
    region: string,
    result: HttpCheckResult | TcpCheckResult,
  ): Promise<void> {
    try {
      const currentStatus = result.status === "success" ? "up" : "down";

      // Get recent events from ClickHouse to determine consecutive counts
      const recentEvents = await clickhouse.query({
        query: `
          SELECT status, timestamp
          FROM monitor_events
          WHERE monitor_id = {monitorId:Int32}
            AND region = {region:String}
          ORDER BY timestamp DESC
          LIMIT {limit:Int32}
        `,
        query_params: {
          monitorId: monitor.id,
          region: region,
          limit: MonitorExecutor.FAILURE_THRESHOLD + 1, // Get enough events to check threshold
        },
      });

      const events = await recentEvents.json<{ status: string; timestamp: string }>();

      // Count consecutive failures/successes from most recent events
      let consecutiveFailures = 0;
      let consecutiveSuccesses = 0;

      // Start with current result
      if (currentStatus === "down") {
        consecutiveFailures = 1;
      } else {
        consecutiveSuccesses = 1;
      }

      // Check previous events
      for (const event of events.data) {
        if (currentStatus === "down" && event.status === "failure") {
          consecutiveFailures++;
        } else if (currentStatus === "up" && event.status === "success") {
          consecutiveSuccesses++;
        } else {
          break; // Different status, not consecutive
        }
      }

      // Check for active incidents in this region
      const activeIncident = await db.query.uptimeIncidents.findFirst({
        where: and(
          eq(uptimeIncidents.monitorId, monitor.id),
          eq(uptimeIncidents.status, "active"),
          eq(uptimeIncidents.region, region),
        ),
      });

      // Create incident when failures reach threshold
      if (currentStatus === "down" && consecutiveFailures === MonitorExecutor.FAILURE_THRESHOLD && !activeIncident) {
        const [newIncident] = await db
          .insert(uptimeIncidents)
          .values({
            organizationId: monitor.organizationId as string,
            monitorId: monitor.id,
            region: region,
            startTime: new Date().toISOString(),
            status: "active",
            lastError: result.error?.message || null,
            lastErrorType: result.error?.type || null,
            failureCount: 1,
          })
          .returning();
        this.logger.info(`Created new incident for monitor ${monitor.id} (${monitor.name}) in region ${region}`);

        // Send notifications for new regional incident
        await this.notificationService.sendIncidentNotifications(monitor, newIncident, "down");
      }
      // Resolve incident when successes reach threshold
      else if (currentStatus === "up" && consecutiveSuccesses === MonitorExecutor.SUCCESS_THRESHOLD && activeIncident) {
        const now = new Date().toISOString();
        await db
          .update(uptimeIncidents)
          .set({
            status: "resolved",
            endTime: now,
            resolvedAt: now,
            updatedAt: now,
          })
          .where(eq(uptimeIncidents.id, activeIncident.id));
        this.logger.info(
          `Resolved incident ${activeIncident.id} for monitor ${monitor.id} (${monitor.name}) in region ${region}`,
        );

        // Send recovery notifications for regional incident
        await this.notificationService.sendIncidentNotifications(
          monitor,
          { ...activeIncident, status: "resolved", endTime: now },
          "recovery",
        );
      }
      // If check failed and there's already an active incident, update it
      else if (currentStatus === "down" && activeIncident) {
        await db
          .update(uptimeIncidents)
          .set({
            failureCount: (activeIncident.failureCount || 0) + 1,
            lastError: result.error?.message || activeIncident.lastError,
            lastErrorType: result.error?.type || activeIncident.lastErrorType,
          })
          .where(eq(uptimeIncidents.id, activeIncident.id));
      }
    } catch (error) {
      this.logger.error(error as Error, `Failed to manage regional incident for region ${region}`);
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down BullMQ monitor executor...");
    this.isShuttingDown = true;

    if (this.worker) {
      try {
        // Close the worker with a timeout
        await Promise.race([
          this.worker.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Worker close timeout")), 5000)),
        ]);
        this.logger.info("BullMQ monitor executor shut down successfully");
      } catch (error) {
        this.logger.error(error as Error, "Error closing worker");
        // Force close if needed
        this.worker = null;
      }
    }
  }
}
