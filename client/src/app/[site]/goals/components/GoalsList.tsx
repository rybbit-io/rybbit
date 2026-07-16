"use client";

import GoalCard from "./GoalCard";
import { Goal, GoalTimeSeriesPoint } from "../../../../api/analytics/endpoints";

interface GoalsListProps {
  goals: Goal[];
  siteId: number;
  timeSeriesByGoal: Map<number, GoalTimeSeriesPoint[]>;
  isLoadingTimeSeries: boolean;
}

export default function GoalsList({ goals, siteId, timeSeriesByGoal, isLoadingTimeSeries }: GoalsListProps) {
  return (
    <div className="flex flex-col gap-3">
      {goals.map(goal => (
        <GoalCard
          key={goal.goalId}
          goal={goal}
          siteId={siteId}
          timeSeries={timeSeriesByGoal.get(goal.goalId)}
          isLoadingTimeSeries={isLoadingTimeSeries}
        />
      ))}
    </div>
  );
}
