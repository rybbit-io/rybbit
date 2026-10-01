"use client";

import { Funnel, Target } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ReactNode } from "react";

import { Goal, SavedFunnel } from "@/api/analytics/endpoints";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CreateGoalPopover } from "./CreateGoalPopover";

const CHIP =
  "inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-neutral-150 px-1.5 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800";

function Chip({
  href,
  icon,
  title,
  fixed = false,
  children,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  /** Keeps its width: a short count, where a name would be cut to make room. */
  fixed?: boolean;
  children: ReactNode;
}) {
  return (
    // One link per row: prefetching them all would flood the router.
    <Link href={href} prefetch={false} className={cn(CHIP, fixed && "shrink-0")} title={title}>
      <span className="flex shrink-0 text-neutral-500 dark:text-neutral-400 [&>svg]:size-3">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

/** Where another page of this site lives, keeping the period, the filters and a private link's key. */
function useSitePageHref() {
  const site = useStore(state => state.site);
  const privateKey = useStore(state => state.privateKey);
  const search = useSearchParams().toString();

  return (page: string) => {
    const path = privateKey ? `/${site}/${privateKey}/${page}` : `/${site}/${page}`;
    return search ? `${path}?${search}` : path;
  };
}

interface UsedInProps {
  eventName: string;
  /** The goals that complete on this event. */
  goals: Goal[];
  /** The saved funnels with a step on this event. */
  funnels: SavedFunnel[];
  /** Goals and funnels are still loading. */
  isLoading: boolean;
  /** The viewer may create goals here. */
  canCreateGoal: boolean;
  className?: string;
}

/**
 * The goals and funnels built on an event, as links to them; or, for an event
 * nothing measures yet, the way to make it a goal.
 */
export function UsedIn({ eventName, goals, funnels, isLoading, canCreateGoal, className }: UsedInProps) {
  const t = useExtracted();
  const pageHref = useSitePageHref();

  if (isLoading) {
    return <Skeleton className="h-4 w-24 rounded" />;
  }

  if (goals.length === 0 && funnels.length === 0) {
    return canCreateGoal ? (
      <CreateGoalPopover eventName={eventName} />
    ) : (
      <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>
    );
  }

  const goalNames = goals.map(goal => goal.name || eventName);
  const funnelNames = funnels.map(funnel => funnel.name);

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {goals.length > 0 && (
        <Chip href={pageHref("goals")} icon={<Target />} title={goalNames.join(", ")}>
          {goals.length === 1 ? goalNames[0] : t("{count} goals", { count: goals.length.toLocaleString() })}
        </Chip>
      )}
      {funnels.length > 0 && (
        <Chip
          href={pageHref("funnels")}
          icon={<Funnel />}
          title={funnelNames.join(", ")}
          fixed={!(funnels.length === 1 && goals.length === 0)}
        >
          {funnels.length === 1 && goals.length === 0
            ? funnelNames[0]
            : t("{count, plural, one {# funnel} other {# funnels}}", { count: funnels.length })}
        </Chip>
      )}
    </div>
  );
}
