import { SEGMENT_DESCRIPTION_MAX_LENGTH, SEGMENT_MAX_FILTERS, SEGMENT_NAME_MAX_LENGTH } from "@rybbit/shared";
import { z } from "zod";
import { validateRegexPattern } from "../utils/getFilterStatement.js";
import { filterSchema } from "../utils/query-validation.js";

const NO_VALUE_TYPES = new Set(["is_null", "is_not_null"]);
const REGEX_TYPES = new Set(["regex", "not_regex"]);
const NUMERIC_TYPES = new Set(["greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal"]);

// A stored segment feeds getFilterStatement on every request that applies it,
// so the same schema that guards the `filters` query param guards the row.
// Shapes the query path merely tolerates (an empty value list, an invalid
// regex, a non-numeric comparison) are rejected here so a saved segment can
// never carry a filter the filter bar itself would refuse.
export const segmentFilterSchema = filterSchema.superRefine((filter, ctx) => {
  if (NO_VALUE_TYPES.has(filter.type)) {
    return;
  }

  if (filter.value.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Filter on "${filter.parameter}" needs at least one value`,
      path: ["value"],
    });
    return;
  }

  if (REGEX_TYPES.has(filter.type)) {
    // The query path only ever runs the first value of a regex filter, so a
    // stored regex filter carries exactly one pattern.
    if (filter.value.length !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A regex filter takes exactly one pattern", path: ["value"] });
    }
    for (const value of filter.value) {
      const error = validateRegexPattern(String(value));
      if (error) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: error, path: ["value"] });
      }
    }
  }

  if (NUMERIC_TYPES.has(filter.type) || filter.parameter === "lat" || filter.parameter === "lon") {
    for (const value of filter.value) {
      if (!Number.isFinite(Number(value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Filter on "${filter.parameter}" needs numeric values`,
          path: ["value"],
        });
      }
    }
  }
});

export const segmentFiltersSchema = z
  .array(segmentFilterSchema)
  .min(1, "A segment needs at least one filter")
  .max(SEGMENT_MAX_FILTERS, `A segment can have at most ${SEGMENT_MAX_FILTERS} filters`);

export const segmentScopeSchema = z.enum(["site", "organization"]);

export const createSegmentSchema = z
  .object({
    name: z.string().trim().min(1, "Segment name is required").max(SEGMENT_NAME_MAX_LENGTH),
    description: z.string().trim().max(SEGMENT_DESCRIPTION_MAX_LENGTH).nullable().optional(),
    filters: segmentFiltersSchema,
    isPublic: z.boolean().optional(),
    scope: segmentScopeSchema.optional(),
  })
  .strict();

export const updateSegmentSchema = createSegmentSchema.partial().strict();

export type CreateSegmentBody = z.infer<typeof createSegmentSchema>;
export type UpdateSegmentBody = z.infer<typeof updateSegmentSchema>;
