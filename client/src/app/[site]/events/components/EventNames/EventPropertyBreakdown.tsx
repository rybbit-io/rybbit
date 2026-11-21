"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";

import { useGetEventProperties } from "@/api/analytics/hooks/events/useGetEventProperties";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShare, groupProperties, PropertyGroup } from "../../utils/properties";

// The properties endpoint stops at this many (key, value) rows.
const PROPERTY_ROW_LIMIT = 500;
const VALUES_SHOWN = 5;

function PropertyColumn({
  group,
  eventCount,
  showCoverage,
}: {
  group: PropertyGroup;
  eventCount: number;
  showCoverage: boolean;
}) {
  const t = useExtracted();
  const [showAll, setShowAll] = useState(false);
  const values = showAll ? group.values : group.values.slice(0, VALUES_SHOWN);
  const more = group.values.length - VALUES_SHOWN;
  // An event carries one value per key, so the values add up to the events that sent the key.
  const coverage = eventCount > 0 ? Math.min(group.total / eventCount, 1) : 0;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-1.5 text-xs dark:border-neutral-800">
        <span className="truncate font-mono font-medium text-neutral-900 dark:text-neutral-100" title={group.key}>
          {group.key}
        </span>
        <span className="shrink-0 text-neutral-500 dark:text-neutral-400">
          {showCoverage
            ? t("{count, plural, one {# value} other {# values}} · on {share} of events", {
                count: group.values.length,
                share: formatShare(coverage),
              })
            : t("{count, plural, one {# value} other {# values}}", { count: group.values.length })}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        {values.map(property => {
          const share = eventCount > 0 ? Math.min(property.count / eventCount, 1) : 0;
          const value = String(property.propertyValue);
          return (
            <div key={value} className="relative flex h-7 items-center rounded-md px-2 text-xs">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-dataviz opacity-25"
                style={{ width: `${share * 100}%` }}
              />
              <div className="relative flex w-full items-center justify-between gap-2">
                <span className="truncate text-neutral-900 dark:text-neutral-100" title={value}>
                  {value === "" ? t("(empty)") : value}
                </span>
                <span className="flex shrink-0 gap-2 tabular-nums text-neutral-900 dark:text-neutral-100">
                  <span>{formatShare(share)}</span>
                  <span className="min-w-10 text-right font-medium">{property.count.toLocaleString()}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {more > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(current => !current)}
          className="mt-1 cursor-pointer px-2 text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          {showAll
            ? t("Show fewer")
            : t("{count, plural, one {Show # more value} other {Show # more values}}", { count: more })}
        </button>
      )}
    </div>
  );
}

interface EventPropertyBreakdownProps {
  eventName: string;
  /** The event's count in the period: what the value shares are out of. */
  eventCount: number;
}

/** What an event was sent with: each property key and how its values split. */
export function EventPropertyBreakdown({ eventName, eventCount }: EventPropertyBreakdownProps) {
  const t = useExtracted();
  const { data, isLoading, isError } = useGetEventProperties(eventName);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, column) => (
          <div key={column} className="space-y-1.5">
            <Skeleton className="h-4 w-28 rounded" />
            {Array.from({ length: 3 }).map((_, row) => (
              <Skeleton key={row} className="h-7 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-xs text-neutral-500 dark:text-neutral-400">{t("Could not load the properties.")}</p>;
  }

  const groups = groupProperties(data ?? []);
  if (groups.length === 0) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t("No properties were sent with this event in this period.")}
      </p>
    );
  }

  // Past the cap the last keys are cut short, so neither their value counts
  // nor their coverage can be trusted.
  const truncated = (data?.length ?? 0) >= PROPERTY_ROW_LIMIT;

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(group => (
          <PropertyColumn key={group.key} group={group} eventCount={eventCount} showCoverage={!truncated} />
        ))}
      </div>
      {truncated && (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          {t("Showing the first {count} property values.", { count: PROPERTY_ROW_LIMIT.toLocaleString() })}
        </p>
      )}
    </div>
  );
}
