import { z } from "zod";

// HTTP method enum
const httpMethodSchema = z.enum(["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"]);

// Auth type enum
const authTypeSchema = z.enum(["none", "basic", "bearer", "api_key", "custom_header"]);

// IP version enum
const ipVersionSchema = z.enum(["any", "ipv4", "ipv6"]);

// Auth credentials schema
const authCredentialsSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
});

// Auth schema
const authSchema = z.object({
  type: authTypeSchema,
  credentials: authCredentialsSchema.optional(),
});

// HTTP config schema
const httpConfigSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  method: httpMethodSchema,
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  auth: authSchema.optional(),
  followRedirects: z.boolean(),
  timeoutMs: z.number().int().min(1000).max(300000),
  ipVersion: ipVersionSchema,
  userAgent: z.string().max(256).optional(),
});

// TCP config schema
const tcpConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1, "Invalid port").max(65535, "Port must be between 1 and 65535"),
  timeoutMs: z.number().int().min(1000).max(300000),
});

// Partial schemas for updates
const partialHttpConfigSchema = z.object({
  url: z.string().url("Please enter a valid URL").optional(),
  method: httpMethodSchema.optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  auth: authSchema.optional(),
  followRedirects: z.boolean().optional(),
  timeoutMs: z.number().int().min(1000).max(300000).optional(),
  ipVersion: ipVersionSchema.optional(),
  userAgent: z.string().max(256).optional(),
});

const partialTcpConfigSchema = z.object({
  host: z.string().min(1, "Host is required").optional(),
  port: z.number().int().min(1, "Invalid port").max(65535, "Port must be between 1 and 65535").optional(),
  timeoutMs: z.number().int().min(1000).max(300000).optional(),
});

// Create monitor schema
export const createMonitorSchema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    name: z.string().max(256).optional(), // Made optional
    monitorType: z.enum(["http", "tcp"]),
    intervalSeconds: z.number().int().min(30).max(86400),
    enabled: z.boolean(),
    httpConfig: httpConfigSchema.optional(),
    tcpConfig: tcpConfigSchema.optional(),
    validationRules: z.array(z.any()).optional(),
    monitoringType: z.enum(["local", "global"]).optional(),
    selectedRegions: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.monitorType === "http") {
        return data.httpConfig !== undefined && data.httpConfig.url !== "";
      }
      if (data.monitorType === "tcp") {
        return data.tcpConfig !== undefined && data.tcpConfig.host !== "";
      }
      return false;
    },
    {
      message: "Monitor type specific configuration is required",
    }
  )
  .refine(
    (data) => {
      if (data.monitoringType === "global") {
        return data.selectedRegions && data.selectedRegions.length > 0;
      }
      return true;
    },
    {
      message: "At least one region must be selected for global monitoring",
    }
  );

// Update monitor schema (all fields optional except what's being updated)
export const updateMonitorSchema = z.object({
  name: z.string().max(256).optional(), // Allow empty string for removing name
  intervalSeconds: z.number().int().min(30).max(86400).optional(),
  enabled: z.boolean().optional(),
  httpConfig: partialHttpConfigSchema.optional(),
  tcpConfig: partialTcpConfigSchema.optional(),
  validationRules: z.array(z.any()).optional(),
  monitoringType: z.enum(["local", "global"]).optional(),
  selectedRegions: z.array(z.string()).optional(),
});

// Type exports
export type CreateMonitorFormData = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorFormData = z.infer<typeof updateMonitorSchema>;