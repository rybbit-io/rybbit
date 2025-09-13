"use client";

import { SavedFunnel, useGetFunnels } from "../../../api/analytics/funnels/useGetFunnels";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { ArrowRight, FilterIcon, Funnel } from "lucide-react";
import { NothingFound } from "../../../components/NothingFound";
import { CreateFunnelDialog } from "./components/CreateFunnel";
import { FunnelRow } from "./components/FunnelRow";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { MobileSidebar } from "../components/Sidebar/MobileSidebar";

// Skeleton for the funnel row component
const FunnelRowSkeleton = () => (
  <div className="rounded-md shadow-sm bg-neutral-900 border border-neutral-800 mb-4 overflow-hidden">
    <div className="flex items-center justify-between py-2 px-5 animate-pulse">
      <div className="flex items-center flex-grow">
        <div className="mt-1 text-xs flex flex-col gap-3 w-full">
          {/* Funnel name and steps skeleton */}
          <div className="flex flex-wrap gap-1 items-center">
            <div className="h-5 bg-neutral-800 rounded w-32 mb-1"></div>
            <div className="flex items-center">
              <div className="rounded bg-neutral-800 px-1.5 py-0.5 w-20 h-5 flex items-center">
                <div className="w-3 h-3 bg-neutral-700 rounded-full mr-1"></div>
                <div className="h-3 bg-neutral-700 rounded w-12 ml-1"></div>
              </div>
              <ArrowRight className="h-3 w-3 mx-1 text-neutral-600" />
              <div className="rounded bg-neutral-800 px-1.5 py-0.5 w-24 h-5 flex items-center">
                <div className="w-3 h-3 bg-neutral-700 rounded-full mr-1"></div>
                <div className="h-3 bg-neutral-700 rounded w-16 ml-1"></div>
              </div>
              <ArrowRight className="h-3 w-3 mx-1 text-neutral-600" />
              <div className="rounded bg-neutral-800 px-1.5 py-0.5 w-20 h-5 flex items-center">
                <div className="w-3 h-3 bg-neutral-700 rounded-full mr-1"></div>
                <div className="h-3 bg-neutral-700 rounded w-12 ml-1"></div>
              </div>
            </div>
          </div>

          {/* Filters skeleton */}
          <div className="flex items-center gap-1">
            <FilterIcon className="h-3 w-3 text-neutral-600" />
            <div className="flex flex-wrap gap-1">
              <div className="rounded bg-neutral-800 px-1.5 py-0.5 w-24 h-5"></div>
              <div className="rounded bg-neutral-800 px-1.5 py-0.5 w-20 h-5"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex">
          <div className="h-8 w-8 bg-neutral-800 rounded-md mr-1"></div>
          <div className="h-8 w-8 bg-neutral-800 rounded-md mr-1"></div>
          <div className="h-8 w-8 bg-neutral-800 rounded-md"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function FunnelsPage() {
  useSetPageTitle("Rybbit · Funnels");

  const { site } = useStore();
  const { data: funnels, isLoading, error } = useGetFunnels(site);

  if (isLoading) {
    return (
      <div className="p-4 max-w-[1300px] mx-auto space-y-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <MobileSidebar />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <FunnelRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <DisabledOverlay message="Funnels" featurePath="funnels">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <div className="flex justify-between items-center mb-3">
          <div>
            <MobileSidebar />
          </div>
          <CreateFunnelDialog />
        </div>

        {error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            Failed to load funnels: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : funnels?.length ? (
          <div className="space-y-4">
            {funnels.map((funnel: SavedFunnel) => (
              <FunnelRow key={funnel.id} funnel={funnel} />
            ))}
          </div>
        ) : (
          <NothingFound
            icon={<Funnel className="w-10 h-10" />}
            title={"No funnels yet"}
            description={"Create your first funnel to track conversions through your site's user journey"}
            action={<CreateFunnelDialog />}
          />
        )}
      </div>
    </DisabledOverlay>
  );
}
