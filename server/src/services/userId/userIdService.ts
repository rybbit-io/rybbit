import crypto from "crypto";
import { SECRET } from "../../lib/const.js";
import { siteConfig } from "../../lib/siteConfig.js";

class UserIdService {
  private cachedSalt: string | null = null;
  private cacheDate: string | null = null; // Store the date the salt was generated for (YYYY-MM-DD format)

  /**
   * Generates a deterministic daily salt based on a secret environment variable.
   * The salt remains the same for the entire UTC day and changes automatically
   * when the UTC date changes. Caches the salt in memory for efficiency.
   *
   * @throws {Error} If the BETTER_AUTH_SECRET environment variable is not set.
   * @returns {string} The daily salt as a hex string.
   */
  private getDailySalt(): string {
    if (!SECRET) {
      console.error(
        "FATAL: BETTER_AUTH_SECRET environment variable is not set. User ID generation will be insecure or fail."
      );
      throw new Error("BETTER_AUTH_SECRET environment variable is missing.");
    }

    // Use UTC date to ensure consistency across timezones and server restarts
    const currentDate = new Date().toISOString().split("T")[0]; // Gets 'YYYY-MM-DD' in UTC

    // Check if the cached salt is still valid for the current UTC date
    if (this.cachedSalt && this.cacheDate === currentDate) {
      return this.cachedSalt;
    }

    const input = SECRET + currentDate;
    const newSalt = crypto.createHash("sha256").update(input).digest("hex");

    this.cachedSalt = newSalt;
    this.cacheDate = currentDate;
    return newSalt;
  }

  /**
   * Generate a user ID based on IP and user agent
   * If the site has salting enabled, also includes a daily rotating salt
   *
   * @param ip User's IP address
   * @param userAgent User's user agent string
   * @param siteId The site ID to check for salting configuration
   * @returns A truncated sha256 hash (12 chars) to identify the user
   */
  async generateUserId(ip: string, userAgent: string, siteId: number): Promise<string> {
    // Only apply salt if the site has salting enabled
    const config = await siteConfig.getConfig(siteId);
    if (config && config.saltUserIds) {
      const dailySalt = this.getDailySalt(); // Get the salt for the current day
      return crypto
        .createHash("sha256")
        .update(ip + userAgent + dailySalt)
        .digest("hex")
        .substring(0, 12);
    }

    // Otherwise, just hash IP and user agent
    return crypto
      .createHash("sha256")
      .update(ip + userAgent)
      .digest("hex")
      .substring(0, 12);
  }
}

export const userIdService = new UserIdService();
