import { z } from "zod";

const gridPosSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const cardMappingSchema = z.object({
  xColumn: z.string().optional(),
  yColumns: z.array(z.string()).optional(),
  seriesColumn: z.string().optional(),
  valueColumn: z.string().optional(),
  valueFormat: z.enum(["number", "percent", "duration", "bytes"]).optional(),
  countryColumn: z.string().optional(),
  dateColumn: z.string().optional(),
});

const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  // SQL is intentionally NOT validated here (validated only at execution time),
  // so in-progress / draft queries can be saved.
  sql: z.string(),
  vizType: z.enum(["table", "line", "area", "bar", "hbar", "pie", "stat", "map", "calendar"]),
  mapping: cardMappingSchema,
  gridPos: gridPosSchema,
});

export const dashboardConfigSchema = z.object({
  cards: z.array(cardSchema),
});

export const createDashboardSchema = z.object({
  name: z.string().min(1, "Dashboard name is required"),
  config: dashboardConfigSchema.optional(),
});

export const updateDashboardSchema = z.object({
  name: z.string().min(1).optional(),
  config: dashboardConfigSchema.optional(),
});
