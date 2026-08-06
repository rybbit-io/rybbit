import { z } from "zod";
import { AUTOCAPTURE_TARGET_TYPES } from "../utils/eventConditions.js";

export const GOAL_TYPES = ["path", "event", ...AUTOCAPTURE_TARGET_TYPES] as const;

export const goalBodySchema = z
  .object({
    name: z.string().optional(),
    goalType: z.enum(GOAL_TYPES),
    config: z.object({
      pathPattern: z.string().optional(),
      eventName: z.string().optional(),
      valuePattern: z.string().max(512).optional(),
      eventPropertyKey: z.string().optional(),
      eventPropertyValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
      propertyFilters: z
        .array(
          z.object({
            key: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
          })
        )
        .optional(),
    }),
  })
  .refine(
    data => {
      if (data.goalType === "path") {
        return !!data.config.pathPattern;
      }
      if (data.goalType === "event") {
        return !!data.config.eventName;
      }
      // Autocapture goals: an empty valuePattern matches any event of the type
      return true;
    },
    {
      message: "Configuration must match goal type",
      path: ["config"],
    }
  )
  .refine(
    data => {
      if (data.goalType !== "event") return true;
      // If one legacy property matching field is provided, both must be provided
      if (data.config.eventPropertyKey && data.config.eventPropertyValue === undefined) {
        return false;
      }
      if (data.config.eventPropertyValue !== undefined && !data.config.eventPropertyKey) {
        return false;
      }
      return true;
    },
    {
      message: "Both eventPropertyKey and eventPropertyValue must be provided together or omitted together",
      path: ["config"],
    }
  );

export type GoalBody = z.infer<typeof goalBodySchema>;
