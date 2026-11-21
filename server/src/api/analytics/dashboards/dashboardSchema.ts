import { z } from "zod";

// Cap cards per dashboard: each card fans out its own ClickHouse query.
// @rybbit/shared is a types-only package here (its imports are erased at
// compile time), so this runtime value lives locally. The client mirrors it in
// dashboards/utils.ts — keep the two in sync.
export const MAX_CARDS_PER_DASHBOARD = 20;

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
  cards: z.array(cardSchema).max(MAX_CARDS_PER_DASHBOARD, `A dashboard can have at most ${MAX_CARDS_PER_DASHBOARD} cards`),
});

export const createDashboardSchema = z.object({
  name: z.string().min(1, "Dashboard name is required"),
  config: dashboardConfigSchema.optional(),
});

export const updateDashboardSchema = z.object({
  name: z.string().min(1).optional(),
  config: dashboardConfigSchema.optional(),
});
