"use client";

import { useMemo, useState } from "react";
import { useGetGoals } from "../../../api/analytics/hooks/goals/useGetGoals";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { NothingFound } from "../../../components/NothingFound";
import { Pagination } from "../../../components/pagination";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useStore } from "../../../lib/store";
import { GOALS_PAGE_FILTERS } from "../../../lib/filterGroups";
import { SubHeader } from "../components/SubHeader/SubHeader";
import CreateGoalButton from "./components/CreateGoalButton";
import GoalsList from "./components/GoalsList";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";

// Goal card skeleton component
const GoalCardSkeleton = () => (
  <div className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden relative animate-pulse">
    <div className="px-4 py-3 flex items-center mb-1">
      {/* Left section skeleton */}
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-full"></div>
          <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-36"></div>
        </div>
        <div className="mt-2">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-48 mt-1"></div>
        </div>
      </div>

      {/* Center section skeleton */}
      <div className="flex-1 flex justify-center">
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="text-center">
            <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-12 mx-auto"></div>
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-16 mx-auto mt-1"></div>
          </div>
          <div className="text-center">
            <div className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-12 mx-auto"></div>
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-16 mx-auto mt-1"></div>
          </div>
        </div>
      </div>

      {/* Right section skeleton */}
      <div className="flex shrink-0 gap-1 pl-4">
        <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        <div className="w-7 h-7 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
      </div>
    </div>
    <div className="bg-neutral-300 dark:bg-neutral-700 h-1.5 w-full absolute bottom-0 left-0"></div>
    <div className="bg-neutral-200 dark:bg-neutral-800 h-1.5 w-1/3 absolute bottom-0 left-0"></div>
  </div>
);

export default function GoalsPage() {
  useSetPageTitle("Rybbit · Goals");

  const { site } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0, // TablePagination uses 0-based indexing
    pageSize: 10, // Show 10 goals per page
  });

  const { data: goalsData, isLoading } = useGetGoals({
    page: pagination.pageIndex + 1, // API uses 1-based indexing
    pageSize: pagination.pageSize,
  });

  // Filter goals based on search query
  const filteredGoals = useMemo(() => {
    if (!goalsData?.data) return [];
    if (!searchQuery.trim()) return goalsData.data;

    const query = searchQuery.toLowerCase();
    return goalsData.data.filter(goal => {
      // Search in goal name
      if (goal.name?.toLowerCase().includes(query)) return true;

      // Search in path pattern or event name
      if (goal.goalType === "path" && goal.config.pathPattern?.toLowerCase().includes(query)) return true;
      if (goal.goalType === "event" && goal.config.eventName?.toLowerCase().includes(query)) return true;

      // Search in event property key/value
      if (
        goal.config.eventPropertyKey?.toLowerCase().includes(query) ||
        String(goal.config.eventPropertyValue)?.toLowerCase().includes(query)
      ) {
        return true;
      }

      return false;
    });
  }, [goalsData?.data, searchQuery]);

  // Create pagination controller for TablePagination
  const paginationController = {
    getState: () => ({ pagination }),
    getCanPreviousPage: () => pagination.pageIndex > 0,
    getCanNextPage: () => {
      if (!goalsData?.meta) return false;
      return pagination.pageIndex + 1 < goalsData.meta.totalPages;
    },
    getPageCount: () => goalsData?.meta?.totalPages || 1,
    setPageIndex: (index: number) => {
      setPagination(prev => ({ ...prev, pageIndex: index }));
      // Scroll to top of page when changing pages
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    previousPage: () => {
      if (pagination.pageIndex > 0) {
        setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    nextPage: () => {
      if (goalsData?.meta && pagination.pageIndex + 1 < goalsData.meta.totalPages) {
        setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
  };

  // Transform data for TablePagination
  const paginationData = goalsData
    ? {
        items: goalsData.data,
        total: goalsData.meta.total,
      }
    : undefined;

  return (
    <DisabledOverlay message="Goals" featurePath="goals">
      <div className="p-2 md:p-4 max-w-[1400px] mx-auto space-y-3">
        <SubHeader availableFilters={GOALS_PAGE_FILTERS} />
        <div className="flex items-center justify-between">
          <Input
            placeholder="Filter goals"
            className="w-48"
            isSearch
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <CreateGoalButton siteId={Number(site)} />
        </div>
        {/* if site is not loaded, show skeleton */}
        {isLoading || !site ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, index) => (
                <GoalCardSkeleton key={`skeleton-${index}`} />
              ))}
          </div>
        ) : !goalsData || goalsData.data.length === 0 ? (
          <NothingFound
            icon={<Target className="w-10 h-10" />}
            title={"No goals found"}
            description={"Create your first conversion goal to start tracking important user actions."}
            action={<CreateGoalButton siteId={Number(site)} />}
          />
        ) : filteredGoals.length === 0 ? (
          <NothingFound
            icon={<Target className="w-10 h-10" />}
            title={"No goals found"}
            description={`No goals match "${searchQuery}"`}
          />
        ) : (
          <div className="space-y-6">
            <GoalsList goals={filteredGoals} siteId={Number(site)} />

            {goalsData.meta.totalPages > 1 && !searchQuery && (
              <Pagination
                table={paginationController}
                data={paginationData}
                pagination={pagination}
                setPagination={setPagination}
                isLoading={isLoading}
                itemName="goals"
              />
            )}
          </div>
        )}
      </div>
    </DisabledOverlay>
  );
}
