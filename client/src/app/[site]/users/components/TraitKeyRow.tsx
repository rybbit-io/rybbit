"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { TraitValuesList } from "./TraitValuesList";

export function TraitKeyRow({
  traitKey,
  userCount,
}: {
  traitKey: string;
  userCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className="font-medium text-sm">{traitKey}</span>
        </div>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs">
          {userCount.toLocaleString()} {userCount === 1 ? "user" : "users"}
        </span>
      </button>
      {expanded && <TraitValuesList traitKey={traitKey} />}
    </div>
  );
}
