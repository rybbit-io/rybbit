import crypto from "crypto";
import { lookupAsn, type AsnLookup } from "../../db/geolocation/asn.js";
import { SECRET } from "../../lib/const.js";
import { siteConfig } from "../../lib/siteConfig.js";
import { isDatacenterAsn } from "../tracker/botBlocking/datacenterAsns.js";
import { bucketIpForIdentity } from "./identityIpBucket.js";
import { normalizeUserAgentForIdentity } from "./normalizeUserAgent.js";
import { resolveStickyUserId } from "./stickyUserId.js";

export interface UserIdOptions {
  /**
   * The Site's salting setting when the caller already holds its Site
   * Configuration. Omit it and the config is fetched — a second read of a row
   * the tracking path has usually just loaded.
   */
  saltUserIds?: boolean;
  /** Request-scoped ASN resolver, shared with the rest of the ingestion path. */
  lookupAsn?: AsnLookup;
  /**
   * The moment the event belongs to — the same instant it will be timestamped
   * with. The daily salt is picked for *this* instant's UTC day rather than for
   * "now", so an event accepted at 23:59:59.9 can't be stamped with day D and
   * fingerprinted with day D+1's salt because ingestion took a millisecond to
   * reach the hash. Defaults to now for callers outside the tracking path.
   */
  receivedAt?: Date;
}

/** The UTC day (YYYY-MM-DD) an instant falls in. */
function utcDayOf(instant: Date): string {
  return instant.toISOString().split("T")[0];
}

class UserIdService {
  private cachedSalt: string | null = null;
  private cacheDate: string | null = null; // Store the date the salt was generated for (YYYY-MM-DD format)

  /**
   * Generates a deterministic salt for a given UTC day from a secret environment
   * variable. The salt is the same for the whole day and changes when the day
   * does. Caches the most recent day's salt in memory for efficiency.
   *
   * The day is a parameter, not a reading of the clock: the caller decides which
   * day an event belongs to, so a request straddling midnight hashes against one
   * day throughout.
   *
   * @throws {Error} If the BETTER_AUTH_SECRET environment variable is not set.
   * @returns {string} The daily salt as a hex string.
   */
  private getDailySalt(utcDay: string): string {
    if (!SECRET) {
      console.error(
        "FATAL: BETTER_AUTH_SECRET environment variable is not set. User ID generation will be insecure or fail."
      );
      throw new Error("BETTER_AUTH_SECRET environment variable is missing.");
    }

    if (this.cachedSalt && this.cacheDate === utcDay) {
      return this.cachedSalt;
    }

    const input = SECRET + utcDay;
    const newSalt = crypto.createHash("sha256").update(input).digest("hex");

    this.cachedSalt = newSalt;
    this.cacheDate = utcDay;
    return newSalt;
  }

  /**
   * Whether this Site salts user IDs — from the caller's already-loaded Site
   * Configuration when it has one, otherwise fetched.
   */
  private async isSalted(siteId: number, options: UserIdOptions): Promise<boolean> {
    if (options.saltUserIds !== undefined) return options.saltUserIds;
    const config = await siteConfig.getConfig(siteId);
    return !!config?.saltUserIds;
  }

  /**
   * Generate a user ID based on IP and user agent
   * If the site has salting enabled, also includes a daily rotating salt
   *
   * The user agent is version-stripped before hashing, so a browser or app
   * update doesn't mint a new identity for the same machine — see
   * `normalizeUserAgentForIdentity`. The raw string is still what reporting
   * parses, and still what sticky re-attachment matches on, so only the
   * fingerprint changes.
   *
   * @param ip User's IP address
   * @param userAgent User's user agent string
   * @param siteId The site ID to check for salting configuration
   * @param options Facts the caller already holds, so they aren't looked up again
   * @returns A truncated sha256 hash (12 chars) to identify the user
   */
  async generateUserId(ip: string, userAgent: string, siteId: number, options: UserIdOptions = {}): Promise<string> {
    const asnLookup = options.lookupAsn ?? lookupAsn;
    const isDatacenterEgress = (candidate: string) => isDatacenterAsn(asnLookup(candidate)?.asn);

    // Datacenter egress (corporate proxies, WARP, Private Relay) rotates IPs
    // between requests; hash a coarse bucket so one visitor stays one user.
    const identityIp = bucketIpForIdentity(ip, isDatacenterEgress);

    // Version tokens change under the user on every browser or app update, so
    // they are stripped before hashing — otherwise an update splits one visitor
    // into two, all at once when the update is a synchronised app rollout.
    const identityUserAgent = normalizeUserAgentForIdentity(userAgent);

    // The event's own day, fixed before anything is hashed against it.
    const saltDay = utcDayOf(options.receivedAt ?? new Date());
    const salted = await this.isSalted(siteId, options);
    const rawUserId = crypto
      .createHash("sha256")
      .update(identityIp + identityUserAgent + (salted ? this.getDailySalt(saltDay) : ""))
      .digest("hex")
      .substring(0, 12);

    // Rotation can still cross bucket boundaries; sticky re-attachment glues an
    // unambiguously-matching new fingerprint back onto its previous identity.
    return resolveStickyUserId({
      siteId,
      rawUserId,
      ipAddress: ip,
      userAgent,
      // The UTC day the salt in rawUserId was built from.
      saltScope: salted ? saltDay : "",
      isDatacenterEgress,
    });
  }

  async generateUserIdFromClientId(clientId: string, siteId: number, options: UserIdOptions = {}): Promise<string> {
    const saltDay = utcDayOf(options.receivedAt ?? new Date());
    const salt = (await this.isSalted(siteId, options)) ? this.getDailySalt(saltDay) : "";

    return crypto.createHash("sha256").update(`${siteId}:${clientId}:${salt}`).digest("hex").substring(0, 12);
  }
}

export const userIdService = new UserIdService();
