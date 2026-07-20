import crypto from "crypto";
import { SECRET } from "../../lib/const.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { bucketIpForIdentity } from "./identityIpBucket.js";
import { resolveStickyUserId } from "./stickyUserId.js";

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
    // Datacenter egress (corporate proxies, WARP, Private Relay) rotates IPs
    // between requests; hash a coarse bucket so one visitor stays one user.
    const identityIp = bucketIpForIdentity(ip);

    // Only apply salt if the site has salting enabled
    const config = await siteConfig.getConfig(siteId);
    const salted = !!config?.saltUserIds;
    const rawUserId = crypto
      .createHash("sha256")
      .update(identityIp + userAgent + (salted ? this.getDailySalt() : ""))
      .digest("hex")
      .substring(0, 12);

    // Rotation can still cross bucket boundaries; sticky re-attachment glues an
    // unambiguously-matching new fingerprint back onto its previous identity.
    return resolveStickyUserId({
      siteId,
      rawUserId,
      ipAddress: ip,
      userAgent,
      // cacheDate is the UTC date the salt in rawUserId was built from.
      saltScope: salted ? (this.cacheDate ?? "") : "",
    });
  }

  async generateUserIdFromClientId(clientId: string, siteId: number): Promise<string> {
    const config = await siteConfig.getConfig(siteId);
    const salt = config?.saltUserIds ? this.getDailySalt() : "";

    return crypto.createHash("sha256").update(`${siteId}:${clientId}:${salt}`).digest("hex").substring(0, 12);
  }
}

export const userIdService = new UserIdService();
