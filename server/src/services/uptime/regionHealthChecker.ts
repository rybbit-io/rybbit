import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { agentRegions } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

export class RegionHealthChecker {
  private intervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;
  private logger = createServiceLogger("region-health-checker");

  constructor(intervalMs: number = 60000) {
    // Default: 1 minute
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    this.logger.info(`Starting region health checker with interval: ${this.intervalMs}ms`);

    // Run initial check
    await this.checkAllRegions();

    // Schedule periodic checks
    this.intervalId = setInterval(async () => {
      await this.checkAllRegions();
    }, this.intervalMs);
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info("Region health checker stopped");
    }
  }

  private async checkAllRegions(): Promise<void> {
    try {
      const regions = await db.query.agentRegions.findMany({
        where: eq(agentRegions.enabled, true),
      });

      // Filter out local region
      const remoteRegions = regions.filter((r) => r.code !== "local");

      this.logger.debug(`Checking health of ${remoteRegions.length} remote regions`);

      const healthPromises = remoteRegions.map((region) =>
        this.checkRegionHealth(region).catch((error) => {
          this.logger.error(error, `Error checking health of region ${region.code}`);
          return { region, isHealthy: false };
        }),
      );

      const results = await Promise.all(healthPromises);

      // Update health status in database
      for (const { region, isHealthy } of results) {
        await db
          .update(agentRegions)
          .set({
            isHealthy,
            lastHealthCheck: new Date().toISOString(),
          })
          .where(eq(agentRegions.code, region.code));
      }

      const healthyCount = results.filter((r) => r.isHealthy).length;
      this.logger.info({ healthyCount, totalRegions: remoteRegions.length }, "Region health check complete");
    } catch (error) {
      this.logger.error(error, "Error in region health check");
    }
  }

  private async checkRegionHealth(region: any): Promise<{ region: any; isHealthy: boolean }> {
    try {
      const response = await fetch(`${region.endpointUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        this.logger.warn({ regionCode: region.code, status: response.status }, "Region returned non-ok status");
        return { region, isHealthy: false };
      }

      const data = await response.json();

      // Verify the response contains expected fields
      if (data.status === "ok" && data.region === region.code) {
        return { region, isHealthy: true };
      }

      this.logger.warn({ regionCode: region.code, response: data }, "Region returned unexpected response");
      return { region, isHealthy: false };
    } catch (error) {
      this.logger.error({ regionCode: region.code, error }, "Health check failed for region");
      return { region, isHealthy: false };
    }
  }
}
