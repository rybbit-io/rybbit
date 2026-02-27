"use client";

import { useExtracted } from "next-intl";
import { SessionsList } from "@/components/Sessions/SessionsList";
import { Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useGetSessions } from "../../../api/analytics/hooks/useGetUserSessions";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SESSION_PAGE_FILTERS } from "../../../lib/filterGroups";
import { SubHeader } from "../components/SubHeader/SubHeader";

const LIMIT = 100;

export default function SessionsPage() {
  const t = useExtracted();
  useSetPageTitle("Sessions");
  const [page, setPage] = useState(1);
  const [identifiedOnly, setIdentifiedOnly] = useState(false);
  const [minPageviews, setMinPageviews] = useState<number | undefined>(undefined);
  const [minEvents, setMinEvents] = useState<number | undefined>(undefined);
  const [minDuration, setMinDuration] = useState<number | undefined>(undefined);

  const { data, isLoading } = useGetSessions({
    page: page,
    limit: LIMIT + 1,
    identifiedOnly: identifiedOnly,
    minPageviews,
    minEvents,
    minDuration,
  });
  const allSessions = data?.data || [];
  const hasNextPage = allSessions.length > LIMIT;
  const sessions = allSessions.slice(0, LIMIT);
  const hasPrevPage = page > 1;

  const handleNumberInput = (
    value: string,
    setter: (val: number | undefined) => void
  ) => {
    if (value === "") {
      setter(undefined);
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0) {
        setter(num);
      }
    }
    setPage(1);
  };

  const headerElement = (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Identified only toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="identified-only"
          checked={identifiedOnly}
          onCheckedChange={val => {
            setIdentifiedOnly(val);
            setPage(1);
          }}
        />
        <Label
          htmlFor="identified-only"
          className="text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer"
        >
          {t("Identified only")}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="https://www.rybbit.io/docs/identify-users" target="_blank">
              <Info className="h-4 w-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("Learn how to identify users")}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Min filters - hidden on mobile */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="min-pageviews"
            className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap"
          >
            {t("Min pageviews")}
          </Label>
          <Input
            id="min-pageviews"
            type="number"
            min={0}
            placeholder="0"
            value={minPageviews ?? ""}
            onChange={e => handleNumberInput(e.target.value, setMinPageviews)}
            className="w-20 h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="min-events"
            className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap"
          >
            {t("Min events")}
          </Label>
          <Input
            id="min-events"
            type="number"
            min={0}
            placeholder="0"
            value={minEvents ?? ""}
            onChange={e => handleNumberInput(e.target.value, setMinEvents)}
            className="w-20 h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="min-duration"
            className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap"
          >
            {t("Min duration (s)")}
          </Label>
          <Input
            id="min-duration"
            type="number"
            min={0}
            placeholder="0"
            value={minDuration ?? ""}
            onChange={e => handleNumberInput(e.target.value, setMinDuration)}
            className="w-20 h-8"
          />
        </div>
      </div>
    </div>
  );

  return (
    <DisabledOverlay message={t("Sessions")} featurePath="sessions">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={SESSION_PAGE_FILTERS} />
        <SessionsList
          sessions={sessions}
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          headerElement={headerElement}
        />
      </div>
    </DisabledOverlay>
  );
}
