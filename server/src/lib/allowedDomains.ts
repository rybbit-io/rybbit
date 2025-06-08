import { db, sql } from "../db/postgres/postgres.js";
import { sites } from "../db/postgres/schema.js";
import { normalizeOrigin } from "../utils.js";
import { initAuth } from "./auth.js";
import dotenv from "dotenv";

dotenv.config();

export let allowList: string[] = [];
export let allowedOriginRegexes: RegExp[] = [];

export const loadAllowedDomains = async () => {
  try {
    // Check if the sites table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sites'
      );
    `;

    // Only query the sites table if it exists
    let domains: { domain: string }[] = [];
    if (tableExists[0].exists) {
      // Use Drizzle to get domains
      const sitesData = await db.select({ domain: sites.domain }).from(sites);
      domains = sitesData;
    }

    allowList = [
      "localhost",
      normalizeOrigin(process.env.BASE_URL || ""),
      ...domains.map(({ domain }) => normalizeOrigin(domain)),
    ];

    // Load regex patterns from ALLOWED_ORIGINS environment variable
    if (process.env.ALLOWED_ORIGINS) {
      try {
        const regexPatterns = process.env.ALLOWED_ORIGINS.split(",").map(
          pattern => pattern.trim()
        );
        allowedOriginRegexes = regexPatterns.map(
          pattern => new RegExp(pattern)
        );
      } catch (error) {
        console.error("Error parsing ALLOWED_ORIGINS regex patterns:", error);
        allowedOriginRegexes = [];
      }
    }
  } catch (error) {
    console.error("Error loading allowed domains:", error);
    // Set default values in case of error
    allowList = ["localhost", normalizeOrigin(process.env.BASE_URL || "")];
    allowedOriginRegexes = [];
    initAuth(allowList);
  }
};

export const isOriginAllowed = (origin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);

  // Check against the regular allow list
  if (allowList.includes(normalizedOrigin)) {
    return true;
  }

  // Check against regex patterns
  const regexMatch = allowedOriginRegexes.some((regex) => regex.test(origin));

  return regexMatch;
};
