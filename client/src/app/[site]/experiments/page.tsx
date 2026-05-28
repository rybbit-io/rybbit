"use client";

import { useExperiments } from "@/api/analytics/hooks/experiments/useExperiments";
import { NothingFound } from "@/components/NothingFound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { GOALS_PAGE_FILTERS } from "@/lib/filterGroups";
import { FlaskConical, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { ExperimentDialog } from "./components/ExperimentDialog";
import { ExperimentRow } from "./components/ExperimentRow";
import { ExperimentSkeleton } from "./components/ExperimentSkeleton";

export default function ExperimentsPage() {
  const t = useExtracted();
  useSetPageTitle("Experiments");
  const { data: experiments, isLoading } = useExperiments();
  const [search, setSearch] = useState("");

  const filteredExperiments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return experiments || [];

    return (experiments || []).filter(experiment =>
      [experiment.name, experiment.description || "", experiment.hypothesis || "", experiment.featureFlag.key].some(
        value => value.toLowerCase().includes(query)
      )
    );
  }, [experiments, search]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 p-2 md:p-4">
      <SubHeader availableFilters={GOALS_PAGE_FILTERS} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="w-full sm:w-64"
          isSearch
          placeholder={t("Filter experiments")}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <ExperimentDialog
          experiments={experiments || []}
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              {t("New experiment")}
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <ExperimentSkeleton />
      ) : filteredExperiments.length > 0 ? (
        <div className="grid gap-3">
          {filteredExperiments.map(experiment => (
            <ExperimentRow key={experiment.experimentId} experiment={experiment} experiments={experiments || []} />
          ))}
        </div>
      ) : experiments?.length ? (
        <NothingFound icon={<FlaskConical className="h-10 w-10" />} title={t("No experiments found")} />
      ) : (
        <NothingFound
          icon={<FlaskConical className="h-10 w-10" />}
          title={t("No experiments yet")}
          description={t("Create an experiment from a multivariate feature flag and connect it to a conversion goal.")}
          action={
            <ExperimentDialog
              experiments={[]}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("New experiment")}
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
