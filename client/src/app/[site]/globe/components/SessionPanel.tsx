"use client";

import { X } from "lucide-react";
import { useExtracted } from "next-intl";
import { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { SessionCard } from "../../../../components/Sessions/SessionCard";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";

interface SessionPanelProps {
  session: GetSessionsResponse[number];
  onClose: () => void;
  className?: string;
}

/**
 * One session in full, docked over the map instead of in a dialog: the map,
 * the list and the replay stay usable while it is open.
 */
export function SessionPanel({ session, onClose, className }: SessionPanelProps) {
  const t = useExtracted();

  return (
    <section
      aria-label={t("Session details")}
      className={cn(
        "flex max-h-full flex-col overflow-hidden rounded-lg border border-neutral-100 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 py-1.5 pl-3 pr-1.5 dark:border-neutral-800">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t("Session details")}</h2>
        <Button
          type="button"
          variant="ghost"
          size="smIcon"
          className="text-neutral-500 dark:text-neutral-400"
          aria-label={t("Close")}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Keyed so opening another session starts it expanded rather than reusing the last card's state. */}
        <SessionCard key={session.session_id} session={session} expandedByDefault />
      </div>
    </section>
  );
}
