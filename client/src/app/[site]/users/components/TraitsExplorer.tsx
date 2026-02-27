"use client";

import { useExtracted } from "next-intl";
import { Tags } from "lucide-react";
import { NothingFound } from "../../../../components/NothingFound";
import { useGetUserTraitKeys } from "../../../../api/analytics/hooks/useGetUserTraits";
import { TraitKeyRow } from "./TraitKeyRow";

export function TraitsExplorer() {
  const t = useExtracted();
  const { data, isLoading } = useGetUserTraitKeys();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-850 bg-white dark:bg-neutral-900">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div
                className="h-5 bg-neutral-200 dark:bg-neutral-800 rounded"
                style={{ width: `${80 + i * 16}px` }}
              />
            </div>
            <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.keys?.length) {
    return (
      <NothingFound
        icon={<Tags className="w-10 h-10" />}
        title={t("No traits found")}
        description={<p>{t("Traits will appear here once you")} <a href="https://rybbit.com/docs/identify-users" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{t("identify users")}</a> {t("with custom properties.")}</p>}
      />
    );
  }

  return (
    <div className="rounded-lg border border-neutral-100 dark:border-neutral-850 bg-white dark:bg-neutral-900">
      {data.keys.map((item) => (
        <TraitKeyRow key={item.key} traitKey={item.key} userCount={item.userCount} />
      ))}
    </div>
  );
}
