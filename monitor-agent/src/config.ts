import { config } from "dotenv";

// Load environment variables
config();

export const CONFIG = {
  // Server configuration
  PORT: parseInt(process.env.PORT || "3003", 10),
  HOST: process.env.HOST || "0.0.0.0",

  // Region identifier (e.g., "us-east", "europe", "asia")
  REGION: process.env.REGION || "unknown",

  // Security - IP whitelist for main server
  ALLOWED_IPS: process.env.ALLOWED_IPS && process.env.ALLOWED_IPS.trim() 
    ? process.env.ALLOWED_IPS.split(",").map((ip) => ip.trim()).filter((ip) => ip.length > 0) 
    : [],

  // Monitoring defaults
  DEFAULT_TIMEOUT_MS: parseInt(process.env.DEFAULT_TIMEOUT_MS || "30000", 10),
  MAX_TIMEOUT_MS: parseInt(process.env.MAX_TIMEOUT_MS || "60000", 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

// Validate required configuration
export function validateConfig(): void {
  const required = ["REGION"];
  const missing = required.filter((key) => !CONFIG[key as keyof typeof CONFIG]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // Warn if no IP whitelist is configured
  if (CONFIG.ALLOWED_IPS.length === 0) {
    console.warn("WARNING: No IP whitelist configured. Agent will accept requests from any IP address.");
  }
}
