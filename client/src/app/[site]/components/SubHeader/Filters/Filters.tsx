"use client";

import { FilterParameter, Segment } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { useGetSegments } from "../../../../../api/analytics/hooks/useSegments";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { removeFilter, updateFilter, useStore } from "../../../../../lib/store";
import { FilterChip } from "./FilterChip";
import { SegmentChip } from "./SegmentChip";
import { SegmentDialog } from "./SegmentDialog";
import { partitionFilters } from "./segmentUtils";

export function Filters({ availableFilters }: { availableFilters?: FilterParameter[] }) {
  const t = useExtracted();
  const { filters, segmentId, site } = useStore();
  const { data: segments } = useGetSegments(site, { enabled: segmentId !== null });
  const [editing, setEditing] = useState<Segment | null>(null);

  const segment = segmentId === null ? undefined : segments?.find(s => s.segmentId === segmentId);
  const { adHoc, intact } = partitionFilters(filters, segment);

  return (
    <div className="flex gap-2 flex-wrap">
      {segment && <SegmentChip segment={segment} intact={intact} onEdit={setEditing} />}
      {adHoc.map(filter => {
        const disabled = availableFilters && !availableFilters.includes(filter.parameter);
        const index = filters.indexOf(filter);

        const pill = (
          <FilterChip
            filter={filter}
            availableFilters={availableFilters}
            disabled={disabled}
            onUpdate={next => updateFilter(next, index)}
            onRemove={() => removeFilter(filter)}
          />
        );

        if (disabled) {
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>{pill}</TooltipTrigger>
              <TooltipContent>
                <p>{t("Filter not active for this page")}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return <div key={index}>{pill}</div>;
      })}
      <SegmentDialog
        open={editing !== null}
        onOpenChange={open => !open && setEditing(null)}
        siteId={site}
        segment={editing ?? undefined}
        availableFilters={availableFilters}
      />
    </div>
  );
}
