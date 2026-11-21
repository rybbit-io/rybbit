import { z } from "zod";

// Mirrors ANNOTATION_COLORS in @rybbit/shared. That package is types-only on
// the server (its imports are erased at compile time), so the runtime list
// lives here — keep the two in sync.
export const ANNOTATION_COLORS = ["amber", "rose", "sky", "violet", "lime"] as const;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
// Full ISO 8601 timestamps must carry Z or an explicit offset; an offset-less
// value would be read in the server's timezone.
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/;

/** True for a real calendar date (rejects 2026-02-30). */
export function isCalendarDate(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Accepts a full ISO 8601 timestamp with offset, or a bare YYYY-MM-DD read as
// midnight UTC. Normalized to an ISO string for the timestamptz column.
const dateInput = z
  .string()
  .trim()
  .refine(value => isCalendarDate(value) || (ISO_WITH_OFFSET.test(value) && !Number.isNaN(Date.parse(value))), {
    message: "Expected an ISO 8601 timestamp with offset (e.g. 2026-08-18T14:10:00Z) or a YYYY-MM-DD date",
  })
  .transform(value => new Date(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value).toISOString());

const endAfterStart = (data: { date?: string; endDate?: string | null }) =>
  !data.date || !data.endDate || Date.parse(data.endDate) > Date.parse(data.date);

// One visible character (an emoji may be several code points), so a pin never
// has to render a word.
// Intl.Segmenter is in Node 16+ but not in this tsconfig's lib, hence the cast.
type GraphemeSegmenter = { segment(value: string): Iterable<{ segment: string }> };
const graphemes: GraphemeSegmenter = new (
  Intl as unknown as { Segmenter: new (locale?: string, options?: { granularity: string }) => GraphemeSegmenter }
).Segmenter(undefined, { granularity: "grapheme" });
const iconInput = z
  .string()
  .trim()
  .max(16)
  .refine(value => value === "" || [...graphemes.segment(value)].length === 1, {
    message: "icon must be a single emoji or character",
  });

export const annotationScopeSchema = z.enum(["site", "organization"]);

export const createAnnotationSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    description: z.string().trim().max(2000).nullable().optional(),
    date: dateInput,
    endDate: dateInput.nullable().optional(),
    color: z.enum(ANNOTATION_COLORS).nullable().optional(),
    icon: iconInput.nullable().optional(),
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
    icon: iconInput.nullable().optional(),
    isPublic: z.boolean().optional(),
    scope: annotationScopeSchema.optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: "No fields to update" });

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;

/** Query filters for GET /annotations: either bound is optional, both are calendar dates. */
export const listAnnotationsQuerySchema = z
  .object({
    start_date: z.string().refine(isCalendarDate, { message: "start_date must be a valid YYYY-MM-DD date" }).optional(),
    end_date: z.string().refine(isCalendarDate, { message: "end_date must be a valid YYYY-MM-DD date" }).optional(),
    time_zone: z.string().optional(),
  })
  .refine(q => !q.start_date || !q.end_date || q.start_date <= q.end_date, {
    message: "start_date must be on or before end_date",
    path: ["start_date"],
  });
