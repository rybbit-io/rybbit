import { Goal, SavedFunnel } from "../../../../api/analytics/endpoints";

/** The goals that complete on this custom event. Event goals match the name exactly. */
export function goalsForEvent(goals: Goal[] | undefined, eventName: string): Goal[] {
  return (goals ?? []).filter(goal => goal.goalType === "event" && goal.config.eventName === eventName);
}

/** The saved funnels with a step on this custom event. */
export function funnelsForEvent(funnels: SavedFunnel[] | undefined, eventName: string): SavedFunnel[] {
  return (funnels ?? []).filter(funnel => funnel.steps.some(step => step.type === "event" && step.value === eventName));
}
