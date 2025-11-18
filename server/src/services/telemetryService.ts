import * as cron from "node-cron";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { clickhouse } from "../db/clickhouse/clickhouse.js";
import { IS_CLOUD, DISABLE_TELEMETRY, SECRET } from "../lib/const.js";
import { processResults } from "../api/analytics/utils.js";
import { createServiceLogger } from "../lib/logger/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TelemetryService {
  private telemetryTask: cron.ScheduledTask | null = null;
  private logger = createServiceLogger("telemetry");

  constructor() {}

  private initializeTelemetryCron() {
    // Only initialize if not cloud and telemetry is not disabled
    if (!IS_CLOUD && !DISABLE_TELEMETRY) {
      this.logger.info("Initializing telemetry cron");
      // Schedule telemetry to run every 24 hours at midnight
      this.telemetryTask = cron.schedule(
        "0 0 * * *",
        async () => {
          try {
            await this.collectAndSendTelemetry();
          } catch (error) {
            this.logger.error(error as Error, "Error during telemetry collection");
          }
        },
        { timezone: "UTC" }
      );

      // Run immediately on startup
      this.collectAndSendTelemetry();

      this.logger.info("Telemetry collection initialized (runs daily at midnight)");
    }
  }

  // Generate instance ID from hashed secret
  private getInstanceId(): string {
    if (!SECRET) {
      // Fallback to a default value if SECRET is not set
      return "no-secret-configured";
    }

    // Create a SHA-256 hash of the secret and take first 12 characters
    const hash = createHash("sha256").update(SECRET).digest("hex");
    return hash.substring(0, 12);
  }

  // Get table row counts from ClickHouse
  private async getTableCounts() {
    const tables = ["events", "session_replay_events", "session_replay_metadata"];

    const counts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const result = await clickhouse.query({
          query: `SELECT count() as count FROM ${table}`,
          format: "JSONEachRow",
        });
        const data = await processResults<{ count: number }>(result);
        counts[table] = data[0]?.count || 0;
      } catch (error) {
        // Table might not exist
        counts[table] = 0;
      }
    }

    return counts;
  }

  // Get ClickHouse database size in GB
  private async getClickhouseSizeGb(): Promise<number> {
    try {
      const result = await clickhouse.query({
        query: `
          SELECT sum(bytes_on_disk) / (1024 * 1024 * 1024) as size_gb
          FROM system.parts
          WHERE active
        `,
        format: "JSONEachRow",
      });
      const data = await processResults<{ size_gb: number }>(result);
      return data[0]?.size_gb || 0;
    } catch (error) {
      this.logger.error(error as Error, "Error getting ClickHouse size");
      return 0;
    }
  }

  // Get package version
  private async getVersion(): Promise<string> {
    const packageJsonPath = path.join(__dirname, "../../package.json");
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    return packageJson.version;
  }

  // Send telemetry to cloud instance
  private async sendTelemetry(data: any) {
    try {
      const response = await fetch("https://demo.rybbit.com/api/admin/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        this.logger.error(`Failed to send telemetry: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error(error as Error, "Error sending telemetry");
    }
  }

  // Main telemetry collection function
  public async collectAndSendTelemetry() {
    // Skip if in cloud environment or telemetry is disabled
    if (IS_CLOUD || DISABLE_TELEMETRY) {
      return;
    }

    try {
      const instanceId = this.getInstanceId();
      const [version, tableCounts, clickhouseSizeGb] = await Promise.all([
        this.getVersion(),
        this.getTableCounts(),
        this.getClickhouseSizeGb(),
      ]);

      const telemetryData = {
        instanceId,
        version,
        tableCounts,
        clickhouseSizeGb,
      };

      await this.sendTelemetry(telemetryData);
      this.logger.info("Telemetry sent successfully");
    } catch (error) {
      this.logger.error(error as Error, "Error collecting telemetry");
    }
  }

  // Method to stop the telemetry cron job (useful for graceful shutdown)
  public stopTelemetryCron() {
    if (this.telemetryTask) {
      this.telemetryTask.stop();
      this.logger.info("Telemetry collection cron stopped");
    }
  }

  public startTelemetryCron() {
    this.initializeTelemetryCron();
  }
}

// Create a singleton instance
export const telemetryService = new TelemetryService();
