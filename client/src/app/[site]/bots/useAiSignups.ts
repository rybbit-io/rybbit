import { useGetAiGoals } from "../../../api/analytics/hooks/bots/useAiVisits";
import { resolveSignupGoal } from "./botsData";

export interface AiSignups {
  /** The goal counted as a signup, as the site named it. */
  goalName: string;
  /** AI-referred sessions that converted. */
  signups: number;
  /** Signup rate among those sessions, in percent. */
  rate: number;
  /** Signup rate across every session, in percent. */
  siteRate: number;
}

/**
 * Signups among the visits AI products sent, or among one product's when its
 * referrer domains are given. Null whenever there is nothing honest to show:
 * the site has no signup goal, the viewer cannot read goals, or the numbers
 * have not loaded.
 */
export function useAiSignups({
  referrerDomains,
  enabled = true,
}: { referrerDomains?: string[]; enabled?: boolean } = {}): AiSignups | null {
  const { data: siteGoals } = useGetAiGoals({ scope: "site", enabled });
  const goal = resolveSignupGoal(siteGoals?.data);
  // No signup goal, no second request.
  const { data: aiGoals } = useGetAiGoals({ scope: "ai", referrerDomains, enabled: enabled && !!goal });
  const aiGoal = goal ? aiGoals?.data.find(candidate => candidate.goalId === goal.goalId) : undefined;

  if (!goal || !aiGoal) return null;

  return {
    goalName: goal.name || goal.config?.eventName || "",
    signups: Number(aiGoal.total_conversions ?? 0),
    rate: Number(aiGoal.conversion_rate ?? 0) * 100,
    siteRate: Number(goal.conversion_rate ?? 0) * 100,
  };
}
