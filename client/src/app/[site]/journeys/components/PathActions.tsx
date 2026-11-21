"use client";

import { Funnel, Rewind, Video } from "lucide-react";
import { useExtracted } from "next-intl";
import { PivotActions, PivotButton } from "@/components/site/PivotActions";
import { Button } from "@/components/ui/button";
import { useReplayAvailable } from "@/hooks/useReplayAvailable";

/** What a path can lead to. The page owns the sheet and the dialog these open. */
export interface PathActionHandlers {
  /** Lists the sessions that took exactly this path; `replaysOnly` keeps those with a replay. */
  openSessions: (path: string[], replaysOnly: boolean) => void;
  /** Absent when the viewer cannot create funnels. */
  saveAsFunnel?: (path: string[]) => void;
}

export interface PathActionsProps {
  path: string[];
  handlers: PathActionHandlers;
  /** False draws icons only, for table rows. */
  showLabels?: boolean;
  /** Draws "Save as funnel" as the solid primary action instead of a quiet pivot. */
  primaryFunnel?: boolean;
  /** Leaves "Save as funnel" out, where the surrounding text is not about one whole path. */
  hideFunnel?: boolean;
  className?: string;
}

/**
 * The pivots of one path. A path is not expressible as filters, so these do
 * not link to the Sessions or Replay pages: they open the path's own sessions
 * in place.
 */
export function PathActions({
  path,
  handlers,
  showLabels = true,
  primaryFunnel = false,
  hideFunnel = false,
  className,
}: PathActionsProps) {
  const t = useExtracted();
  const replayAvailable = useReplayAvailable();
  const { saveAsFunnel } = handlers;

  return (
    // No standard pivots: the wrapper is used for its layout and for keeping clicks from a clickable row.
    <PivotActions actions={[]} className={className}>
      <PivotButton
        icon={<Rewind />}
        label={t("Sessions")}
        showLabel={showLabels}
        onClick={() => handlers.openSessions(path, false)}
      />
      {replayAvailable && (
        // Desktop only, like the sidebar's Replay item.
        <PivotButton
          icon={<Video />}
          label={t("Replays")}
          showLabel={showLabels}
          className="hidden md:inline-flex"
          onClick={() => handlers.openSessions(path, true)}
        />
      )}
      {/* A funnel needs two steps; grouped by section, a path can be a single one. */}
      {saveAsFunnel &&
        !hideFunnel &&
        path.length >= 2 &&
        (primaryFunnel ? (
          <Button type="button" variant="accent" size="xs" className="ml-auto gap-1" onClick={() => saveAsFunnel(path)}>
            <Funnel />
            {t("Save as funnel")}
          </Button>
        ) : (
          <PivotButton
            icon={<Funnel />}
            label={t("Save as funnel")}
            showLabel={showLabels}
            onClick={() => saveAsFunnel(path)}
          />
        ))}
    </PivotActions>
  );
}
