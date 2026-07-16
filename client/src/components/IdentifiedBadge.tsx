"use client";

import { IdCard } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { userStore } from "../lib/userStore";
import { EditTraitsDialog } from "./EditTraitsDialog";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface IdentifiedBadgeProps {
  className?: string;
  traits?: Record<string, unknown> | null;
  // Identified user id; when set and the viewer is signed in, clicking the
  // badge opens the trait editor
  userId?: string;
}

export function IdentifiedBadge({ className, traits, userId }: IdentifiedBadgeProps) {
  const t = useExtracted();
  const { user } = userStore();
  const [editOpen, setEditOpen] = useState(false);
  // Lazily mounted so lists full of badges don't each carry a dialog
  const [dialogMounted, setDialogMounted] = useState(false);

  const canEdit = !!userId && !!user;

  // Filter out null/undefined values and format for display
  const traitEntries = traits
    ? Object.entries(traits).filter(([, value]) => value !== null && value !== undefined)
    : [];

  const badge = (
    <Badge variant="success" className={className}>
      <IdCard className="w-3 h-3" />
    </Badge>
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {canEdit ? (
            <button
              type="button"
              aria-label={t("Edit Traits")}
              className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
              onClick={e => {
                // Badges sit inside clickable cards and links; editing must
                // not trigger the surrounding navigation
                e.preventDefault();
                e.stopPropagation();
                setDialogMounted(true);
                setEditOpen(true);
              }}
            >
              {badge}
            </button>
          ) : (
            badge
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">{t("Identified User")}</p>
          {traitEntries.length > 0 ? (
            <div className="text-xs space-y-0.5">
              {traitEntries.slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-neutral-400">{key}:</span>
                  <span className="truncate max-w-[180px]">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
              {traitEntries.length > 8 && (
                <div className="text-neutral-400 text-xs mt-1">
                  {t("+{count} more traits", { count: String(traitEntries.length - 8) })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-400">{t("No traits set")}</p>
          )}
          {canEdit && <p className="text-xs text-neutral-400 mt-1">{t("Click to edit traits")}</p>}
        </TooltipContent>
      </Tooltip>
      {dialogMounted && userId && (
        <EditTraitsDialog userId={userId} traits={traits ?? null} open={editOpen} onOpenChange={setEditOpen} />
      )}
    </>
  );
}
