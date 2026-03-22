"use client";

import { useExtracted } from "next-intl";
import { Input } from "@/components/ui/input";
import { GOALS_PAGE_FILTERS } from "@/lib/filterGroups";
import { useStore } from "@/lib/store";
import { ArrowRight, Funnel } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { useGetFunnels } from "../../../api/analytics/hooks/funnels/useGetFunnels";
import { SavedFunnel } from "../../../api/analytics/endpoints";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { ErrorState } from "../../../components/ErrorState";
import { NothingFound } from "../../../components/NothingFound";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { CreateFunnelDialog } from "./components/CreateFunnel";
import { FunnelRow } from "./components/FunnelRow";
import Link from "next/link";

// Skeleton for the funnel row component
const FunnelRowSkeleton = () => (
  <Card className="mb-4 overflow-hidden">
    <div className="flex items-center justify-between py-2 px-5 animate-pulse">
      <div className="flex items-center grow">
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 flex flex-col gap-3">
          {/* Funnel name and steps skeleton */}
          <div className="flex flex-wrap gap-1">
            <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-32 mr-2"></div>
            <div className="flex items-center">
              <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 flex items-center">
                <div className="w-3 h-3 bg-neutral-200 dark:bg-neutral-700 rounded mr-1"></div>
                <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
              </span>
              <ArrowRight className="h-3 w-3 mx-1 text-neutral-400" />
              <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 flex items-center">
                <div className="w-3 h-3 bg-neutral-200 dark:bg-neutral-700 rounded mr-1"></div>
                <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
              </span>
              <ArrowRight className="h-3 w-3 mx-1 text-neutral-400" />
              <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 flex items-center">
                <div className="w-3 h-3 bg-neutral-200 dark:bg-neutral-700 rounded mr-1"></div>
                <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-14"></div>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex">
          <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div>
          <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div>
          <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div>
          <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-md"></div>
        </div>
      </div>
    </div>
  </Card>
);

export default function FunnelsPage() {
  const t = useExtracted();
  useSetPageTitle("Funnels");

  const { site } = useStore();
  const { data: funnels, isLoading, error } = useGetFunnels(site);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter funnels based on search query
  const filteredFunnels = useMemo(() => {
    if (!funnels) return [];
    if (!searchQuery.trim()) return funnels;

    const query = searchQuery.toLowerCase();
    return funnels.filter((funnel: SavedFunnel) => {
      // Search in funnel name
      if (funnel.name.toLowerCase().includes(query)) return true;

      // Search in step values
      return funnel.steps.some(
        step => step.value.toLowerCase().includes(query) || step.name?.toLowerCase().includes(query)
      );
    });
  }, [funnels, searchQuery]);

  return (
    <DisabledOverlay message="Funnels" featurePath="funnels">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={GOALS_PAGE_FILTERS} />
        <div className="flex justify-between items-center">
          <Input
            placeholder={t("Filter funnels")}
            className="w-48"
            isSearch
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <CreateFunnelDialog />
        </div>

        {isLoading || !funnels ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <FunnelRowSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title={t("Failed to load funnels")}
            message={t("There was a problem fetching the funnels. Please try again later.")}
          />
        ) : filteredFunnels?.length ? (
          <div className="space-y-4">
            {filteredFunnels.map((funnel: SavedFunnel, index: number) => (
              <FunnelRow key={funnel.id} funnel={funnel} index={index} />
            ))}
          </div>
        ) : funnels?.length ? (
          <NothingFound
            icon={<Funnel className="w-10 h-10" />}
            title={t("No funnels found")}
            description={t('No funnels match "{searchQuery}"', { searchQuery })}
          />
        ) : (
          <NothingFound
            icon={<Funnel className="w-10 h-10" />}
            title={t("No funnels yet")}
            description={<span>{t("Create your first funnel to track conversions through your site's user journey.")} <Link href="https://rybbit.com/docs/funnels" className="text-blue-500 hover:underline" target="_blank">{t("Learn more")}</Link></span>}
            action={<CreateFunnelDialog />}
          />
        )}
      </div>
    </DisabledOverlay>
  );
}
