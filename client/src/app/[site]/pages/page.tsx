"use client";

import { useDebounce } from "@uidotdev/usehooks";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { PagesMode, PagesSort, PagesSortOrder } from "@/api/analytics/hooks/useGetPages";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { AnalysisBar } from "@/components/site/AnalysisBar";
import { BreakdownControl } from "@/components/site/BreakdownControl";
import { Input } from "@/components/ui/input";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { useStore } from "@/lib/store";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { PagesInsight } from "./components/PagesInsight";
import { PagesStatBand } from "./components/PagesStatBand";
import { PAGE_SIZE, PagesTable } from "./components/PagesTable";

type Breakdown = "section" | "none";

// Each list opens on the column it is about.
const MODE_SORT: Record<PagesMode, PagesSort> = {
  all: "pageviews",
  entry: "entries",
  exit: "exits",
};

export default function Pages() {
  const t = useExtracted();
  const { site, time, filters } = useStore();

  const [breakdown, setBreakdown] = useState<Breakdown>("section");
  const [mode, setMode] = useState<PagesMode>("all");
  const [sorting, setSorting] = useState<{ sort: PagesSort; order: PagesSortOrder }>({
    sort: "pageviews",
    order: "desc",
  });
  const [search, setSearch] = useState("");
  // The page number belongs to one period and filter set: a new one starts at the first page.
  const scope = JSON.stringify([time, filters]);
  const [paging, setPaging] = useState({ page: 1, scope });
  const page = paging.scope === scope ? paging.page : 1;
  const setPage = (next: number) => setPaging({ page: next, scope });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [focusSection, setFocusSection] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);
  // Typing waits for a pause; clearing the box applies at once.
  const activeSearch = search.trim() ? debouncedSearch : "";

  useSetPageTitle("Pages");

  if (!site) {
    return null;
  }

  // Any change to what is listed starts again from the first page, and drops a pending scroll.
  const restart = () => {
    setPage(1);
    setFocusSection(null);
  };

  return (
    <DisabledOverlay message={t("pages")} featurePath="pages">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader />
        <PagesStatBand />
        <AnalysisBar
          // On a phone the search takes a row of its own, full width.
          className="[&>div:last-child]:w-full sm:[&>div:last-child]:w-auto"
          breakdown={
            <BreakdownControl<Breakdown>
              value={breakdown}
              onChange={value => {
                setBreakdown(value);
                restart();
              }}
              options={[
                { value: "section", label: t("Section") },
                { value: "none", label: t("None") },
              ]}
            />
          }
          end={
            <div className="w-full sm:w-64 [&>div]:w-full">
              <Input
                isSearch
                type="search"
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  restart();
                }}
                placeholder={t("Search title or path")}
                aria-label={t("Search title or path")}
                className="h-8 text-xs"
              />
            </div>
          }
        >
          <SegmentedControl<PagesMode>
            size="sm"
            aria-label={t("Pages to list")}
            value={mode}
            onValueChange={value => {
              setMode(value);
              setSorting({ sort: MODE_SORT[value], order: "desc" });
              restart();
            }}
            options={[
              { value: "all", label: t("All pages") },
              { value: "entry", label: t("Entry pages") },
              { value: "exit", label: t("Exit pages") },
            ]}
          />
        </AnalysisBar>
        <PagesInsight
          onShowSection={({ section, rank }) => {
            if (rank === null) return;
            // The section's place among the rows sorted by views is its place in the default table.
            setBreakdown("section");
            setMode("all");
            setSorting({ sort: "pageviews", order: "desc" });
            setSearch("");
            setPage(Math.floor(rank / PAGE_SIZE) + 1);
            setExpanded(current => new Set(current).add(section));
            setFocusSection(section);
          }}
        />
        <PagesTable
          // A search lists the matching pages themselves: a rollup of a few matches would read as the section's total.
          group={breakdown === "section" && !activeSearch ? "section" : "page"}
          mode={mode}
          search={activeSearch}
          sort={sorting.sort}
          order={sorting.order}
          onSort={sort => {
            setSorting(current => ({
              sort,
              order: current.sort === sort && current.order === "desc" ? "asc" : "desc",
            }));
            restart();
          }}
          page={page}
          onPageChange={setPage}
          expanded={expanded}
          onExpandedChange={setExpanded}
          focusSection={focusSection}
          onFocusHandled={() => setFocusSection(null)}
        />
      </div>
    </DisabledOverlay>
  );
}
