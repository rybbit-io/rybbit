"use client";

import { Filter, FilterParameter, Segment } from "@rybbit/shared";
import { ListFilterPlus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRef, useState } from "react";
import { useUserOrganizations } from "../../../../../api/admin/hooks/useOrganizations";
import { useGetSite } from "../../../../../api/admin/hooks/useSites";
import { Button } from "../../../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../components/ui/popover";
import { authClient } from "../../../../../lib/auth";
import { addFilter, useStore } from "../../../../../lib/store";
import { cn } from "../../../../../lib/utils";
import { FilterPicker } from "./FilterPicker";
import { SegmentDialog } from "./SegmentDialog";
import { SegmentsTab } from "./SegmentsTab";

type Tab = "filters" | "segments";
type DialogState = { segment?: Segment; initialFilters?: Filter[] } | null;

/**
 * The Filter button. Its popover has two tabs: the filter picker that was
 * always here, and the saved segments for this site. Segments live entirely
 * inside this popover so the toolbar gains nothing.
 */
export function NewFilterButton({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const t = useExtracted();
  const session = authClient.useSession();
  const { site, privateKey, filters } = useStore();
  const { data: siteInfo } = useGetSite(site, { enabled: !!session.data });
  const { data: organizations } = useUserOrganizations();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("filters");
  const [parameter, setParameter] = useState<FilterParameter | null>(null);
  const pendingRef = useRef<() => Filter | null>(() => null);
  const [dialog, setDialog] = useState<DialogState>(null);

  // A signed-in visitor on someone else's public site is not a member; the
  // private-link view is read-only by design even for members.
  const isMember = !!siteInfo?.organizationId && !!organizations?.some(org => org.id === siteInfo.organizationId);
  const canWrite = !!session.data && !privateKey && isMember;

  const resetPicker = () => {
    pendingRef.current = () => null;
    setParameter(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const pending = pendingRef.current();
      if (pending) addFilter(pending);
      resetPicker();
    }
    setOpen(isOpen);
  };

  // Closing from an action that already did its work must not commit a
  // half-built filter left behind on the Filters tab.
  const closePopover = () => {
    resetPicker();
    setOpen(false);
  };

  const selectTab = (next: Tab) => {
    if (next !== tab) resetPicker();
    setTab(next);
  };

  const openDialog = (state: NonNullable<DialogState>) => {
    closePopover();
    setDialog(state);
  };

  const tabButton = (value: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => selectTab(value)}
      className={cn(
        "flex-1 py-2 text-xs font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400",
        tab === value
          ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-50"
          : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <ListFilterPlus className="w-4 h-4" />
            {t("Filter")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div role="tablist" className="flex border-b border-neutral-200 dark:border-neutral-800">
            {tabButton("filters", t("Filters"))}
            {tabButton("segments", t("Segments"))}
          </div>
          {tab === "filters" ? (
            <FilterPicker
              availableFilters={availableFilters}
              onCommit={addFilter}
              onClose={closePopover}
              pendingRef={pendingRef}
              parameter={parameter}
              setParameter={setParameter}
            />
          ) : (
            <SegmentsTab
              siteId={site}
              canWrite={canWrite}
              onNew={() => openDialog({})}
              onSaveCurrent={() => openDialog({ initialFilters: filters })}
              onEdit={segment => openDialog({ segment })}
              onApplied={closePopover}
            />
          )}
        </PopoverContent>
      </Popover>
      <SegmentDialog
        open={dialog !== null}
        onOpenChange={isOpen => !isOpen && setDialog(null)}
        siteId={site}
        segment={dialog?.segment}
        initialFilters={dialog?.initialFilters}
        availableFilters={availableFilters}
      />
    </>
  );
}
