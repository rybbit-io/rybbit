import { Goal, SavedFunnel, SilentEvent } from "../../../../api/analytics/endpoints";

/** The goals that complete on this custom event. Event goals match the name exactly. */
export function goalsForEvent(goals: Goal[] | undefined, eventName: string): Goal[] {
  return (goals ?? []).filter(goal => goal.goalType === "event" && goal.config.eventName === eventName);
}

/** The saved funnels with a step on this custom event. */
export function funnelsForEvent(funnels: SavedFunnel[] | undefined, eventName: string): SavedFunnel[] {
  return (funnels ?? []).filter(funnel => funnel.steps.some(step => step.type === "event" && step.value === eventName));
}

/** How often a silent event fired per day, over the days between its first and last occurrence in the lookback. */
export function silentEventDailyAverage(event: Pick<SilentEvent, "total" | "spanDays">): number {
  return event.spanDays > 0 ? event.total / event.spanDays : 0;
}
