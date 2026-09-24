"use client";

import { useEffect, useMemo, useState } from "react";
import { useExtracted } from "next-intl";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { Input } from "../../../../components/ui/input";
import { useGetUserTraitValues } from "../../../../api/analytics/hooks/useGetUserTraits";
import { TraitValueUsersList } from "./TraitValueUsersList";

function TraitValueRow({
  traitKey,
  value,
  userCount,
}: {
  traitKey: string;
  value: string;
  userCount: number;
}) {
  const t = useExtracted();
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-1.5 px-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className="text-neutral-700 dark:text-neutral-300 truncate">
            {value || <span className="italic text-neutral-400">{t("empty")}</span>}
          </span>
        </div>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">
          {userCount === 1 ? t("{count} user", { count: userCount.toLocaleString() }) : t("{count} users", { count: userCount.toLocaleString() })}
        </span>
      </button>
      {expanded && <TraitValueUsersList traitKey={traitKey} value={value} userCount={userCount} />}
    </div>
  );
}

export function TraitValuesList({ traitKey }: { traitKey: string }) {
  const t = useExtracted();
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetUserTraitValues(traitKey);

  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const flattenedValues = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.values);
  }, [data]);

  const filteredValues = useMemo(() => {
    if (!searchTerm) return flattenedValues;
    const lower = searchTerm.toLowerCase();
    return flattenedValues.filter((item) =>
      item.value.toLowerCase().includes(lower)
    );
  }, [flattenedValues, searchTerm]);

  useEffect(() => {
    if (
      entry?.isIntersecting &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isLoading
    ) {
      fetchNextPage();
    }
  }, [
    entry?.isIntersecting,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  ]);

  if (isLoading) {
    return (
      <div className="border-l border-neutral-150 dark:border-neutral-750 ml-[23px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-3 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded shrink-0" />
              <div
                className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded"
                style={{ width: `${100 + i * 20}px` }}
              />
            </div>
            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-l border-neutral-150 dark:border-neutral-750 ml-[23px]">
      {flattenedValues.length > 5 && (
        <div className="px-3 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              placeholder={t("Search values...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
      )}
      {filteredValues.map((item, index) => (
        <TraitValueRow
          key={`${item.value}-${index}`}
          traitKey={traitKey}
          value={item.value}
          userCount={item.userCount}
        />
      ))}
      {hasNextPage && (
        <div ref={ref} className="py-2 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("Loading more...")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
