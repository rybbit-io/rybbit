import { QueryClient } from "@tanstack/react-query";

// Reads that carry the goals each session completed. Several are cached until
// the period changes, so a goal created, edited or deleted must drop them.
const GOAL_DEPENDENT_KEYS = [
  "sessions",
  "sessions-infinite",
  "sessions-summary",
  "session-details-infinite",
  "user-goals",
  "user-session-goals",
];

export function invalidateGoalDependents(queryClient: QueryClient) {
  for (const key of GOAL_DEPENDENT_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}
