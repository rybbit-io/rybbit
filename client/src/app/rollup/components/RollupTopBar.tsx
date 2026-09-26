"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { Team } from "@/api/admin/endpoints/teams";
import { DateSelector } from "@/components/DateSelector/DateSelector";
import { TeamSelector } from "@/components/TeamSelector";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { canGoBack, canGoForward, goBack, goForward, useStore } from "@/lib/store";
import { RollupFilterButton } from "./RollupFilters";

export function RollupTopBar({
  teams,
  selectedTeamFilter,
  onSelectedTeamFilterChange,
  allTags,
  selectedTags,
  onSelectedTagsChange,
  filterSiteIds,
}: {
  teams: Team[];
  selectedTeamFilter: string;
  onSelectedTeamFilterChange: (value: string) => void;
  allTags: string[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  /** Sites the filter picker suggests values from; omitted in lite mode, which can't filter. */
  filterSiteIds?: number[];
}) {
  const t = useExtracted();
  const time = useStore((state) => state.time);
  const setTime = useStore((state) => state.setTime);

  return (
    <div className="flex flex-wrap gap-2 justify-between items-center">
      <div className="flex flex-wrap items-center gap-2">
        <TeamSelector
          teams={teams}
          value={selectedTeamFilter}
          onValueChange={onSelectedTeamFilterChange}
          canCreateTeam={false}
        />
        {allTags.length > 0 && (
          <div className="w-[200px]">
            <MultiSelect
              options={allTags.map((tag) => ({ value: tag, label: tag }))}
              value={selectedTags}
              onValueChange={onSelectedTagsChange}
              placeholder={t("Filter by tags...")}
              searchPlaceholder={t("Search tags...")}
              emptyText={t("No tags found.")}
              className="border-neutral-150 dark:border-neutral-800"
            />
          </div>
        )}
        {filterSiteIds && <RollupFilterButton siteIds={filterSiteIds} />}
      </div>
      <div className="flex items-center gap-2">
        <DateSelector time={time} setTime={setTime} />
        <div className="flex items-center">
          <Button
            variant="secondary"
            size="icon"
            onClick={goBack}
            disabled={!canGoBack(time)}
            className="rounded-r-none h-8 w-8"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={goForward}
            disabled={!canGoForward(time)}
            className="rounded-l-none -ml-px h-8 w-8"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
