"use client";

import type { Annotation } from "@rybbit/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useExtracted } from "next-intl";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTimezone } from "@/lib/store";
import { annotationColor, formatAnnotationDate, type AnnotationCluster } from "./annotationUtils";

function ColorDot({ annotation }: { annotation: Annotation }) {
  const { resolvedTheme } = useTheme();
  return (
    <span
      className="w-2 h-2 rounded-[2px] shrink-0"
      style={{ background: annotationColor(annotation.color, resolvedTheme === "dark") }}
    />
  );
}

/** Compact hover card: titles and the date, nothing interactive. */
export function AnnotationHoverCard({ cluster }: { cluster: AnnotationCluster }) {
  const timezone = getTimezone();
  const first = cluster.items[0].annotation;
  const last = cluster.items[cluster.items.length - 1].annotation;
  const dateText =
    cluster.items.length === 1 || first.date === last.date
      ? formatAnnotationDate(first, timezone)
      : `${formatAnnotationDate({ ...first, endDate: null }, timezone)} – ${formatAnnotationDate({ ...last, endDate: null }, timezone)}`;
  return (
    <ChartTooltip className="px-3 py-2 max-w-[260px]">
      <div className="flex flex-col gap-1">
        {cluster.items.map(({ annotation }) => (
          <div key={annotation.annotationId} className="flex items-center gap-2 text-sm min-w-0">
            <ColorDot annotation={annotation} />
            <span className="truncate font-medium">
              {annotation.icon ? `${annotation.icon} ` : ""}
              {annotation.title}
            </span>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-1 tabular-nums">{dateText}</div>
    </ChartTooltip>
  );
}

/** Full details for a pin, with edit and delete for those allowed to manage. */
export function AnnotationPopoverContent({
  cluster,
  canManage,
  onEdit,
  onDelete,
}: {
  cluster: AnnotationCluster;
  canManage: (annotation: Annotation) => boolean;
  onEdit: (annotation: Annotation) => void;
  onDelete: (annotation: Annotation) => void;
}) {
  const t = useExtracted();
  const timezone = getTimezone();
  return (
    <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[320px] overflow-y-auto">
      {cluster.items.map(({ annotation }) => (
        <div key={annotation.annotationId} className="px-3 py-2.5 flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1 pt-0.5">
              <ColorDot annotation={annotation} />
              <span className="font-medium text-sm leading-tight break-words">
                {annotation.icon ? `${annotation.icon} ` : ""}
                {annotation.title}
              </span>
            </div>
            {canManage(annotation) && (
              <div className="flex items-center -mr-1.5 -mt-1 shrink-0">
                <Button variant="ghost" size="smIcon" aria-label={t("Edit annotation")} onClick={() => onEdit(annotation)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="smIcon"
                  aria-label={t("Delete annotation")}
                  onClick={() => onDelete(annotation)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground tabular-nums">
            <span>{formatAnnotationDate(annotation, timezone)}</span>
            {annotation.siteId === null && <Badge variant="outline">{t("All sites")}</Badge>}
            {annotation.isPublic && <Badge variant="success">{t("Public")}</Badge>}
          </div>
          {annotation.description && (
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
              {annotation.description}
            </p>
          )}
          {annotation.userName && <div className="text-xs text-muted-foreground">{annotation.userName}</div>}
        </div>
      ))}
    </div>
  );
}
