"use client";

import { Info, Tags } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useGetUsersSummary } from "../../../api/analytics/hooks/useGetUsers";
import { useGetUserTraitKeys } from "../../../api/analytics/hooks/useGetUserTraits";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { AnalysisBar } from "../../../components/site/AnalysisBar";
import { BreakdownControl, BreakdownOption } from "../../../components/site/BreakdownControl";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { USER_PAGE_FILTERS } from "../../../lib/filterGroups";
import { useStore } from "../../../lib/store";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { NO_QUICK_FILTERS, QuickFilters, QuickFilterState } from "./components/QuickFilters";
import { UsersStatBand } from "./components/UsersStatBand";
import { UsersTable } from "./components/UsersTable";

// Not a trait key: keys come from identify() calls and may be any string, the empty one aside.
const NO_BREAKDOWN = "";

export default function UsersPage() {
  useSetPageTitle("Users");
  const t = useExtracted();

  const [breakdown, setBreakdown] = useState(NO_BREAKDOWN);
  const [quickFilters, setQuickFilters] = useState<QuickFilterState>(NO_QUICK_FILTERS);

  // All time compared with "the previous period" is all time again: the same numbers, and a row of 0% deltas.
  const comparisonEnabled = useStore(state => state.previousTime !== null && state.previousTime.mode !== "all-time");
  const { data: summary } = useGetUsersSummary();
  const { data: traitKeys } = useGetUserTraitKeys();

  const keys = traitKeys?.keys.map(item => item.key) ?? [];
  const breakdownOptions: BreakdownOption<string>[] = [
    { value: NO_BREAKDOWN, label: t("None") },
    ...keys.map(key => ({ value: key, label: key, icon: <Tags /> })),
  ];
  // A trait that no profile carries any more cannot group anyone.
  const activeBreakdown = keys.includes(breakdown) ? breakdown : null;

  // "New" needs a period with a before; without one the chip is gone and so is its filter.
  const newOnly = quickFilters.isNew && summary?.new_users !== null;

  return (
    <DisabledOverlay message={t("Users")} featurePath="users">
      <div className="p-2 md:p-4 max-w-[1400px] mx-auto space-y-3">
        <SubHeader availableFilters={USER_PAGE_FILTERS} />
        <UsersStatBand comparisonEnabled={comparisonEnabled} />
        <AnalysisBar
          // With no traits on the site there is nothing to break the users down by.
          breakdown={
            keys.length > 0 ? (
              <BreakdownControl
                value={activeBreakdown ?? NO_BREAKDOWN}
                onChange={setBreakdown}
                options={breakdownOptions}
              />
            ) : null
          }
          end={
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://rybbit.com/docs/identify-users"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("Learn how to identify users")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  <Info className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("Learn how to identify users")}</p>
              </TooltipContent>
            </Tooltip>
          }
        >
          <span className="mx-1 hidden h-5 w-px bg-neutral-200 dark:bg-neutral-800 sm:block" aria-hidden="true" />
          <QuickFilters value={quickFilters} onChange={setQuickFilters} summary={summary} />
        </AnalysisBar>
        <UsersTable
          breakdown={activeBreakdown}
          narrowing={{
            identifiedOnly: quickFilters.identified,
            newOnly,
            minSessions: quickFilters.power ? summary?.power_min_sessions : undefined,
          }}
          // A power-user filter cannot be sent before the session count that defines it has loaded.
          ready={!quickFilters.power || summary !== undefined}
          comparisonEnabled={comparisonEnabled}
        />
      </div>
    </DisabledOverlay>
  );
}
