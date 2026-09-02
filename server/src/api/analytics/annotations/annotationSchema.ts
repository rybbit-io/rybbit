import { z } from "zod";

// Mirrors ANNOTATION_COLORS in @rybbit/shared. That package is types-only on
// the server (its imports are erased at compile time), so the runtime list
// lives here — keep the two in sync.
export const ANNOTATION_COLORS = ["amber", "rose", "sky", "violet", "lime"] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Accepts a full ISO 8601 timestamp (any offset) or a bare YYYY-MM-DD, which is
// read as midnight UTC. Normalized to an ISO string for the timestamptz column.
const dateInput = z
  .string()
  .trim()
  .refine(value => DATE_ONLY.test(value) || !Number.isNaN(Date.parse(value)), {
    message: "Expected an ISO 8601 timestamp or YYYY-MM-DD date",
  })
  .transform(value => new Date(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value).toISOString());

const endAfterStart = (data: { date?: string; endDate?: string | null }) =>
  !data.date || !data.endDate || Date.parse(data.endDate) > Date.parse(data.date);

export const annotationScopeSchema = z.enum(["site", "organization"]);

export const createAnnotationSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    description: z.string().trim().max(2000).nullable().optional(),
    date: dateInput,
    endDate: dateInput.nullable().optional(),
    color: z.enum(ANNOTATION_COLORS).nullable().optional(),
    icon: z.string().trim().max(16).nullable().optional(),
    isPublic: z.boolean().optional().default(false),
    scope: annotationScopeSchema.optional().default("site"),
  })
  .refine(endAfterStart, { message: "endDate must be after date", path: ["endDate"] });

export const updateAnnotationSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    date: dateInput.optional(),
    endDate: dateInput.nullable().optional(),
    color: z.enum(ANNOTATION_COLORS).nullable().optional(),
    icon: z.string().trim().max(16).nullable().optional(),
    isPublic: z.boolean().optional(),
    scope: annotationScopeSchema.optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: "No fields to update" });

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;
