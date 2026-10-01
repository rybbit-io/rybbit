"use client";

import { LocateFixed, Minus, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { ReactNode } from "react";
import { cn } from "../../../../lib/utils";
import { getMapController } from "../utils/mapController";

const PANEL =
  "overflow-hidden rounded-lg border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900";

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  );
}

/** Zoom and reset, for whichever map engine is mounted. */
export function MapControls({ className }: { className?: string }) {
  const t = useExtracted();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn(PANEL, "flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800")}>
        <MapButton label={t("Zoom in")} onClick={() => getMapController()?.zoomIn()}>
          <Plus className="h-4 w-4" />
        </MapButton>
        <MapButton label={t("Zoom out")} onClick={() => getMapController()?.zoomOut()}>
          <Minus className="h-4 w-4" />
        </MapButton>
      </div>
      <div className={PANEL}>
        <MapButton label={t("Reset view")} onClick={() => getMapController()?.resetView()}>
          <LocateFixed className="h-4 w-4" />
        </MapButton>
      </div>
    </div>
  );
}
