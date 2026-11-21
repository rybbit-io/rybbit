import { z } from "zod";

export const experimentStatusSchema = z.enum(["draft", "running", "paused", "completed"]);

export const experimentBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  hypothesis: z.string().trim().max(1000).optional().nullable(),
  featureFlagId: z.number().int().positive(),
  primaryGoalId: z.number().int().positive().optional().nullable(),
  status: experimentStatusSchema.default("draft"),
  winningVariant: z.string().trim().max(100).optional().nullable(),
});

export const experimentUpdateSchema = experimentBodySchema.partial().refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export type ExperimentBody = z.infer<typeof experimentBodySchema>;
export type ExperimentUpdate = z.infer<typeof experimentUpdateSchema>;
