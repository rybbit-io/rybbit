import { z } from "zod";
import type { FeatureFlagPayloadValue } from "../../db/postgres/schema.js";
import { precompileFeatureFlagRegexPattern, validateFeatureFlagRegexPattern } from "../../services/featureFlags/regex.js";

const payloadValueSchema: z.ZodType<FeatureFlagPayloadValue> = z.lazy(() =>
  z.union([
    z.string().max(4096),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(payloadValueSchema).max(100),
    z.record(payloadValueSchema),
  ])
);

const ruleValueSchema = z.union([
  z.string().max(512),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string().max(512), z.number(), z.boolean()])).max(50),
]);

const featureFlagKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z][A-Za-z0-9_.:-]*$/, "Key must start with a letter and contain only letters, numbers, _, ., :, or -");

const featureFlagTypeSchema = z.enum(["boolean", "multivariate", "remote_config"]);
const featureFlagRuntimeSchema = z.enum(["client", "server", "both"]);

export const featureFlagRuleSchema = z
  .object({
    field: z.enum([
      "hostname",
      "pathname",
      "query",
      "referrer",
      "language",
      "country",
      "region",
      "city",
      "device_type",
      "user_id",
      "trait",
    ]),
    key: z.string().trim().min(1).max(128).optional(),
    operator: z.enum(["equals", "not_equals", "contains", "starts_with", "ends_with", "regex"]),
    value: ruleValueSchema,
  })
  .superRefine((rule, ctx) => {
    if (rule.operator !== "regex") return;

    const values = Array.isArray(rule.value) ? rule.value : [rule.value];
    values.forEach((value, index) => {
      const path = Array.isArray(rule.value) ? ["value", index] : ["value"];

      if (typeof value !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Regex rule values must be strings",
          path,
        });
        return;
      }

      const error = validateFeatureFlagRegexPattern(value);
      if (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
          path,
        });
        return;
      }

      precompileFeatureFlagRegexPattern(value);
    });
  })
  .refine(
    rule => {
      if (rule.field === "query" || rule.field === "trait") {
        return !!rule.key;
      }
      return true;
    },
    {
      message: "key is required for query and trait rules",
      path: ["key"],
    }
  );

const featureFlagVariantSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z][A-Za-z0-9_.:-]*$/,
      "Variant key must start with a letter and contain only letters, numbers, _, ., :, or -"
    ),
  name: z.string().trim().max(120).optional(),
  rolloutPercentage: z.number().int().min(0).max(100),
  payload: payloadValueSchema.optional(),
});

const featureFlagConditionSetSchema = z.object({
  name: z.string().trim().max(120).optional(),
  rules: z.array(featureFlagRuleSchema).max(25).default([]),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  variants: z.array(featureFlagVariantSchema).max(20).optional(),
  payload: payloadValueSchema.optional().nullable(),
});

const featureFlagBaseSchema = z.object({
  key: featureFlagKeySchema,
  description: z.string().trim().max(1000).optional().nullable(),
  enabled: z.boolean().default(false),
  runtime: featureFlagRuntimeSchema.default("client"),
  flagType: featureFlagTypeSchema.default("boolean"),
  payload: payloadValueSchema.optional().nullable(),
  variants: z.array(featureFlagVariantSchema).max(20).default([]),
  rolloutPercentage: z.number().int().min(0).max(100).default(100),
  rules: z.array(featureFlagRuleSchema).max(25).default([]),
  conditionSets: z.array(featureFlagConditionSetSchema).max(20).default([]),
});

const featureFlagUpdateBaseSchema = z.object({
  key: featureFlagKeySchema.optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  enabled: z.boolean().optional(),
  runtime: featureFlagRuntimeSchema.optional(),
  flagType: featureFlagTypeSchema.optional(),
  payload: payloadValueSchema.optional().nullable(),
  variants: z.array(featureFlagVariantSchema).max(20).optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  rules: z.array(featureFlagRuleSchema).max(25).optional(),
  conditionSets: z.array(featureFlagConditionSetSchema).max(20).optional(),
});

export const featureFlagBodySchema = featureFlagBaseSchema.superRefine(validateFeatureFlagShape);

export const featureFlagUpdateSchema = featureFlagUpdateBaseSchema
  .refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .superRefine(validateFeatureFlagShape);

export const evaluateFeatureFlagsSchema = z.object({
  anonymousId: z.string().trim().min(1).max(128),
  identifiedUserId: z.string().trim().max(255).optional(),
  hostname: z.string().max(253).optional(),
  pathname: z.string().max(2048).optional(),
  querystring: z.string().max(2048).optional(),
  query: z.record(z.string().max(2048)).optional(),
  referrer: z.string().max(2048).optional(),
  language: z.string().max(35).optional(),
  screenWidth: z.number().int().nonnegative().optional(),
  screenHeight: z.number().int().nonnegative().optional(),
});

export type FeatureFlagBody = z.infer<typeof featureFlagBodySchema>;
export type FeatureFlagUpdateBody = z.infer<typeof featureFlagUpdateSchema>;
export type EvaluateFeatureFlagsBody = z.infer<typeof evaluateFeatureFlagsSchema>;

function validateFeatureFlagShape(
  data: z.infer<typeof featureFlagBaseSchema> | z.infer<typeof featureFlagUpdateBaseSchema>,
  ctx: z.RefinementCtx
) {
  const variants = data.variants ?? [];
  const conditionSets = data.conditionSets ?? [];
  const flagType = data.flagType;

  if (flagType === "remote_config" && variants.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Remote config flags cannot have variants",
      path: ["variants"],
    });
  }

  if (flagType === "boolean" && variants.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Boolean flags cannot have variants",
      path: ["variants"],
    });
  }

  if (flagType === "multivariate") {
    const hasConditionSetVariants = conditionSets.some(conditionSet => (conditionSet.variants?.length ?? 0) > 0);

    if (!hasConditionSetVariants && variants.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Multivariate flags require at least two variants",
        path: ["variants"],
      });
    }

    const uniqueKeys = new Set(variants.map(variant => variant.key));
    if (uniqueKeys.size !== variants.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Variant keys must be unique",
        path: ["variants"],
      });
    }

    const totalRollout = variants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);
    if (totalRollout > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Variant rollout percentages cannot exceed 100",
        path: ["variants"],
      });
    }
  }

  conditionSets.forEach((conditionSet, index) => {
    const setVariants = conditionSet.variants ?? [];
    const path = ["conditionSets", index];

    if (flagType === "boolean" && setVariants.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Boolean condition sets cannot have variants",
        path: [...path, "variants"],
      });
    }

    if (flagType === "remote_config" && setVariants.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Remote config condition sets cannot have variants",
        path: [...path, "variants"],
      });
    }

    if (flagType === "multivariate" && setVariants.length > 0) {
      if (setVariants.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multivariate condition sets require at least two variants",
          path: [...path, "variants"],
        });
      }

      const uniqueSetKeys = new Set(setVariants.map(variant => variant.key));
      if (uniqueSetKeys.size !== setVariants.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Variant keys must be unique",
          path: [...path, "variants"],
        });
      }

      const setTotalRollout = setVariants.reduce((sum, variant) => sum + variant.rolloutPercentage, 0);
      if (setTotalRollout > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Variant rollout percentages cannot exceed 100",
          path: [...path, "variants"],
        });
      }
    }

    if (conditionSet.rolloutPercentage !== undefined && flagType === "multivariate" && setVariants.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Multivariate condition sets use variant rollout percentages",
        path: [...path, "rolloutPercentage"],
      });
    }
  });
}
