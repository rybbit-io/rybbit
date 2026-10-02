"use client";

import { Filter } from "@rybbit/shared";
import { BookmarkPlus, Rewind, User, Video } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { KeyboardEvent, MouseEvent, ReactNode, useState } from "react";
import { SegmentDialog } from "@/app/[site]/components/SubHeader/Filters/SegmentDialog";
import { Button } from "@/components/ui/button";
import { useCanOnSite } from "@/hooks/usePermissions";
import { usePivotHref } from "@/hooks/usePivotHref";
import { useReplayAvailable } from "@/hooks/useReplayAvailable";
import { canPivot, mergeFilters } from "@/lib/pivots";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export type PivotAction = "sessions" | "users" | "replays" | "segment";

const DEFAULT_ACTIONS: PivotAction[] = ["sessions", "users", "replays"];

export interface PivotButtonProps {
  /** A 16px icon. The button sizes it. */
  icon: ReactNode;
  label: string;
  /** Renders a link. Without it the button calls `onClick`. */
  href?: string;
  onClick?: () => void;
  /** False draws the icon alone; the label stays as the accessible name and tooltip. */
  showLabel?: boolean;
  className?: string;
}

/**
 * One quiet pivot. `PivotActions` draws the standard four with it; a page
 * passes its own (Journeys, Funnel, Goal) as children of `PivotActions`.
 */
export function PivotButton({ icon, label, href, onClick, showLabel = true, className }: PivotButtonProps) {
  const classes = cn("gap-1 font-normal text-neutral-600 dark:text-neutral-300", className);
  const name = showLabel ? undefined : label;
  const content = (
    <>
      {icon}
      {showLabel && label}
    </>
  );

  if (href) {
    return (
      <Button asChild variant="ghost" size="xs" className={classes}>
        {/* One link per row and per target: prefetching them all would flood the router. */}
        <Link href={href} prefetch={false} aria-label={name} title={name} onClick={onClick}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className={classes}
      aria-label={name}
      title={name}
      onClick={onClick}
    >
      {content}
    </Button>
  );
}

function ReplaysPivot({ href, label, showLabel }: { href: string; label: string; showLabel: boolean }) {
  const replayAvailable = useReplayAvailable();
  if (!replayAvailable) return null;

  // Desktop only, like the sidebar's Replay item.
  return (
    <PivotButton icon={<Video />} label={label} href={href} showLabel={showLabel} className="hidden md:inline-flex" />
  );
}

function SaveSegmentPivot({ filters, label, showLabel }: { filters: Filter[]; label: string; showLabel: boolean }) {
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  const currentFilters = useStore(state => state.filters);
  const canWriteSegments = useCanOnSite("segments:write", site);
  const [open, setOpen] = useState(false);

  // The same rule as the Filter popover's Segments tab: public viewers hold no
  // permissions, and a private link is read-only even for members.
  if (privateKey || !canWriteSegments) return null;

  return (
    <>
      <PivotButton icon={<BookmarkPlus />} label={label} showLabel={showLabel} onClick={() => setOpen(true)} />
      <SegmentDialog
        open={open}
        onOpenChange={setOpen}
        siteId={site}
        initialFilters={mergeFilters(currentFilters, filters)}
        applyOnCreate={false}
      />
    </>
  );
}

export interface PivotActionsProps {
  /**
   * The filters that identify the aggregate these actions belong to, e.g.
   * `[{ parameter: "pathname", type: "equals", value: ["/pricing"] }]`. They
   * are applied on top of the page's current filters. Leave empty for the
   * page's whole population.
   */
  filters?: Filter[];
  /** Which actions to offer, in order. Defaults to Sessions, Users and Replays. */
  actions?: PivotAction[];
  /** False draws icons only, for tight rows. */
  showLabels?: boolean;
  /** Page-specific pivots, drawn after the standard ones. Use `PivotButton`. */
  children?: ReactNode;
  className?: string;
}

const stopClick = (event: MouseEvent) => event.stopPropagation();

// Enter and Space activate the focused pivot or type into the segment dialog; a
// row that toggles on them would call preventDefault and swallow both. Other
// keys keep bubbling so page-level shortcuts still work.
const stopActivationKeys = (event: KeyboardEvent) => {
  if (event.key === "Enter" || event.key === " ") event.stopPropagation();
};

/**
 * The doorway from an aggregate number to the people behind it: quiet links to
 * the Sessions, Users and Replay pages with the current period and filters
 * narrowed by `filters`, and a button that saves those filters as a segment.
 *
 * An action is left out when it cannot be honoured: a target that would drop
 * one of `filters` (see `canPivot`), Replays on a site without replay, Save
 * segment for a viewer who cannot write segments.
 *
 * Safe inside a clickable row: clicks and activation keys do not reach the
 * row, including those from inside the segment dialog.
 */
export function PivotActions({
  filters = [],
  actions = DEFAULT_ACTIONS,
  showLabels = true,
  children,
  className,
}: PivotActionsProps) {
  const t = useExtracted();
  const pivotHref = usePivotHref();

  return (
    // Not interactive itself: the handlers only keep its buttons' events from a clickable ancestor.
    <div
      className={cn("flex flex-wrap items-center gap-0.5", className)}
      onClick={stopClick}
      onKeyDown={stopActivationKeys}
    >
      {actions.map(action => {
        if (action === "segment") {
          return <SaveSegmentPivot key={action} filters={filters} label={t("Save segment")} showLabel={showLabels} />;
        }
        if (!canPivot(action, filters)) return null;

        const href = pivotHref(action, filters);
        if (action === "replays") {
          return <ReplaysPivot key={action} href={href} label={t("Replays")} showLabel={showLabels} />;
        }
        return action === "sessions" ? (
          <PivotButton key={action} icon={<Rewind />} label={t("Sessions")} href={href} showLabel={showLabels} />
        ) : (
          <PivotButton key={action} icon={<User />} label={t("Users")} href={href} showLabel={showLabels} />
        );
      })}
      {children}
    </div>
  );
}
