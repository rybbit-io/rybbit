import { experiments, featureFlags, goals } from "../../db/postgres/schema.js";

export type ExperimentRecord = typeof experiments.$inferSelect;
export type FeatureFlagRecord = typeof featureFlags.$inferSelect;
export type GoalRecord = typeof goals.$inferSelect;

export type ExperimentWithRelations = {
  experiment: ExperimentRecord;
  featureFlag: FeatureFlagRecord;
  primaryGoal: GoalRecord | null;
};

export type ExperimentResultRow = {
  variant: string;
  sessions: number;
  exposures: number;
  conversions: number;
};
