"use client";

import { useState } from "react";
import {
  useGetGoals,
  useGetGoalsPastMinutes,
} from "../../../api/analytics/useGetGoals";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { NothingFound } from "../../../components/NothingFound";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { GOALS_PAGE_FILTERS, useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import CreateGoalButton from "./components/CreateGoalButton";
import GoalsList from "./components/GoalsList";

export default function GoalsPage() {
  useSetPageTitle("Rybbit · Goals");

  const { time, site } = useStore();
  const isPast24HoursMode = time.mode === "last-24-hours";
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9; // Show 9 cards (3x3 grid)

  // Use the appropriate hook based on the mode
  const { data: goalsData, isLoading } = isPast24HoursMode
    ? useGetGoalsPastMinutes({
        page: currentPage,
        pageSize,
      })
    : useGetGoals({
        page: currentPage,
        pageSize,
      });

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of page when changing pages
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Goal card skeleton component
  const GoalCardSkeleton = () => (
    <div className="rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden relative animate-pulse">
      <div className="px-4 py-3 flex items-center mb-1">
        {/* Left section skeleton */}
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-neutral-800 rounded-full"></div>
            <div className="h-5 bg-neutral-800 rounded w-36"></div>
          </div>
          <div className="mt-2">
            <div className="h-4 bg-neutral-800 rounded w-48 mt-1"></div>
          </div>
        </div>

        {/* Center section skeleton */}
        <div className="flex-1 flex justify-center">
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="text-center">
              <div className="h-5 bg-neutral-800 rounded w-12 mx-auto"></div>
              <div className="h-3 bg-neutral-800 rounded w-16 mx-auto mt-1"></div>
            </div>
            <div className="text-center">
              <div className="h-5 bg-neutral-800 rounded w-12 mx-auto"></div>
              <div className="h-3 bg-neutral-800 rounded w-16 mx-auto mt-1"></div>
            </div>
          </div>
        </div>

        {/* Right section skeleton */}
        <div className="flex flex-shrink-0 gap-1 pl-4">
          <div className="w-7 h-7 bg-neutral-800 rounded"></div>
          <div className="w-7 h-7 bg-neutral-800 rounded"></div>
        </div>
      </div>
      <div className="bg-neutral-700 h-1.5 w-full absolute bottom-0 left-0"></div>
      <div className="bg-neutral-800 h-1.5 w-1/3 absolute bottom-0 left-0"></div>
    </div>
  );

  return (
    <DisabledOverlay>
      <div className="p-2 md:p-4 max-w-[1400px] mx-auto space-y-3">
        <SubHeader availableFilters={GOALS_PAGE_FILTERS} />
        <div className="flex items-center justify-between">
          <div />
          <CreateGoalButton siteId={Number(site)} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, index) => (
                <GoalCardSkeleton key={`skeleton-${index}`} />
              ))}
          </div>
        ) : !goalsData || goalsData.data.length === 0 ? (
          <NothingFound
            title={"No goals found"}
            description={
              "Create your first conversion goal to start tracking important user actions."
            }
            action={<CreateGoalButton siteId={Number(site)} />}
          />
        ) : (
          <GoalsList
            goals={goalsData.data}
            siteId={Number(site)}
            paginationMeta={goalsData.meta}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </DisabledOverlay>
  );
}
