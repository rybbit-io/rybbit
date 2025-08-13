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
  url: z.string().url("Invalid URL format"),
  method: httpMethodSchema.default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  auth: authSchema.optional(),
  followRedirects: z.boolean().default(true),
  timeoutMs: z.number().int().positive().max(300000).optional(), // Max 5 minutes
  ipVersion: ipVersionSchema.optional(),
  userAgent: z.string().max(256).optional(),
});

// TCP config schema
const tcpConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535, "Port must be between 1 and 65535"),
  timeoutMs: z.number().int().positive().max(300000).optional(), // Max 5 minutes
});

// Validation rule schemas
const statusCodeRuleSchema = z.object({
  type: z.literal("status_code"),
  operator: z.enum(["equals", "not_equals", "in", "not_in"]),
  value: z.union([z.number(), z.array(z.number())]),
});

const responseTimeRuleSchema = z.object({
  type: z.literal("response_time"),
  operator: z.enum(["less_than", "greater_than"]),
  value: z.number().positive(),
});

const bodyContainsRuleSchema = z.object({
  type: z.enum(["response_body_contains", "response_body_not_contains"]),
  value: z.string(),
  caseSensitive: z.boolean().optional(),
});

const headerExistsRuleSchema = z.object({
  type: z.literal("header_exists"),
  header: z.string(),
});

const headerValueRuleSchema = z.object({
  type: z.literal("header_value"),
  header: z.string(),
  operator: z.enum(["equals", "contains"]),
  value: z.string(),
});

const responseSizeRuleSchema = z.object({
  type: z.literal("response_size"),
  operator: z.enum(["less_than", "greater_than"]),
  value: z.number().positive(),
});

const validationRuleSchema = z.discriminatedUnion("type", [
  statusCodeRuleSchema,
  responseTimeRuleSchema,
  bodyContainsRuleSchema,
  headerExistsRuleSchema,
  headerValueRuleSchema,
  responseSizeRuleSchema,
]);

// Create monitor schema
export const createMonitorSchema = z
  .object({
    organizationId: z.string().min(1, "Organization ID is required"),
    name: z.string().max(256).optional(), // Made optional
    monitorType: z.enum(["http", "tcp"]),
    intervalSeconds: z.number().int().min(30).max(86400, "Interval must be between 60 and 86400 seconds"),
    enabled: z.boolean().default(true),
    httpConfig: httpConfigSchema.optional(),
    tcpConfig: tcpConfigSchema.optional(),
    validationRules: z.array(validationRuleSchema).default([]),
    monitoringType: z.enum(["local", "global"]).default("local"),
    selectedRegions: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      if (data.monitorType === "http") {
        return data.httpConfig !== undefined;
      }
      if (data.monitorType === "tcp") {
        return data.tcpConfig !== undefined;
      }
      return false;
    },
    {
      message: "Monitor type specific configuration is required",
    },
  );

// Update monitor schema (similar to create but with optional fields)
export const updateMonitorSchema = z.object({
  name: z.string().max(256).optional(), // Allow empty string to remove name
  intervalSeconds: z.number().int().min(30).max(86400).optional(),
  enabled: z.boolean().optional(),
  httpConfig: httpConfigSchema.optional(),
  tcpConfig: tcpConfigSchema.optional(),
  validationRules: z.array(validationRuleSchema).optional(),
  monitoringType: z.enum(["local", "global"]).optional(),
  selectedRegions: z.array(z.string()).optional(),
});

// Query params schemas
export const getMonitorsQuerySchema = z.object({
  organizationId: z.string().optional(),
  enabled: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  monitorType: z.enum(["http", "tcp"]).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default("50"),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).default("0"),
});

export const getMonitorEventsQuerySchema = z.object({
  status: z.enum(["success", "failure", "timeout"]).optional(),
  region: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default("20"),
  offset: z.string().transform(Number).pipe(z.number().int().nonnegative()).default("0"),
});

export const getMonitorStatsQuerySchema = z.object({
  hours: z.string().transform(Number).pipe(z.number().int().positive().max(8760)).optional(), // Max 1 year in hours
  region: z.string().optional(),
  bucket: z
    .enum(["minute", "five_minutes", "ten_minutes", "fifteen_minutes", "hour", "day", "week", "month", "year"])
    .optional(),
});

// Type exports
export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
export type GetMonitorsQuery = z.infer<typeof getMonitorsQuerySchema>;
export type GetMonitorEventsQuery = z.infer<typeof getMonitorEventsQuerySchema>;
export type GetMonitorStatsQuery = z.infer<typeof getMonitorStatsQuerySchema>;
