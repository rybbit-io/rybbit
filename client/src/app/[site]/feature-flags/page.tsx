"use client";

import { useFeatureFlags } from "@/api/analytics/hooks/featureFlags/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NothingFound } from "@/components/NothingFound";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { Flag, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { FeatureFlagDialog } from "./components/FeatureFlagDialog";
import { FeatureFlagSkeleton } from "./components/FeatureFlagSkeleton";
import { FeatureFlagTable } from "./components/FeatureFlagTable";

export default function FeatureFlagsPage() {
  const t = useExtracted();
  useSetPageTitle("Feature Flags");
  const { data: flags, isLoading } = useFeatureFlags();
  const [search, setSearch] = useState("");

  const filteredFlags = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return flags || [];
    return (flags || []).filter(flag =>
      [flag.key, flag.description || ""].some(value => value.toLowerCase().includes(query))
    );
  }, [flags, search]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 p-2 md:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="w-full sm:w-64"
          isSearch
          placeholder={t("Filter feature flags")}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <FeatureFlagDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              {t("New flag")}
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <FeatureFlagSkeleton />
      ) : filteredFlags.length > 0 ? (
        <FeatureFlagTable flags={filteredFlags} />
      ) : flags?.length ? (
        <NothingFound icon={<Flag className="h-10 w-10" />} title={t("No feature flags found")} />
      ) : (
        <NothingFound
          icon={<Flag className="h-10 w-10" />}
          title={t("No feature flags yet")}
          action={
            <FeatureFlagDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("New flag")}
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
