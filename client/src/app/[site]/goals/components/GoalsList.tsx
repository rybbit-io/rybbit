"use client";

import GoalCard from "./GoalCard";
import { Goal, GoalTimeSeriesPoint } from "../../../../api/analytics/endpoints";

interface GoalsListProps {
  goals: Goal[];
  siteId: number;
  /** goals:write: edit, clone and delete. */
  canWrite: boolean;
  timeSeriesByGoal: Map<number, GoalTimeSeriesPoint[]>;
  isLoadingTimeSeries: boolean;
}

export default function GoalsList({ goals, siteId, canWrite, timeSeriesByGoal, isLoadingTimeSeries }: GoalsListProps) {
  return (
    <div className="flex flex-col gap-3">
      {goals.map(goal => (
        <GoalCard
          key={goal.goalId}
          goal={goal}
          siteId={siteId}
          canWrite={canWrite}
          timeSeries={timeSeriesByGoal.get(goal.goalId)}
          isLoadingTimeSeries={isLoadingTimeSeries}
        />
      ))}
    </div>
  );
}
