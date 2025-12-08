"use client";

import GoalCard from "./GoalCard";
import { Goal } from "../../../../api/analytics/endpoints";

interface GoalsListProps {
  goals: Goal[];
  siteId: number;
}

export default function GoalsList({ goals, siteId }: GoalsListProps) {
  return (
    <div className="flex flex-col gap-3">
      {goals.map(goal => (
        <GoalCard key={goal.goalId} goal={goal} siteId={siteId} />
      ))}
    </div>
  );
}
