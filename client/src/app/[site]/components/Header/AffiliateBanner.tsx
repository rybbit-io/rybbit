"use client";

import { HandCoins, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { useAppEnv } from "../../../../hooks/useIsProduction";
import { IS_CLOUD } from "../../../../lib/const";

const STORAGE_KEY = "affiliate-banner-dismissed";

export function AffiliateBanner() {
  const t = useExtracted();
  const [dismissed, setDismissed] = useState(true);

  const isProduction = useAppEnv() === "prod";

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  if (!IS_CLOUD || !isProduction || dismissed) return null;

  return (
    <div className="mt-4 px-4 py-3 rounded-lg border border-emerald-200 dark:border-emerald-400/30 bg-emerald-100/80 dark:bg-emerald-900/20 text-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        <HandCoins className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
          {t("Earn 50% recurring commission by referring Rybbit.")}{" "}
          <a
            href="https://rybbit.com/affiliate"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-emerald-900 dark:hover:text-emerald-100"
          >
            {t("Join our affiliate program")}
          </a>
        </span>
      </div>
      <button
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "true");
          setDismissed(true);
        }}
        className="ml-4 p-1 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800/40 text-emerald-600 dark:text-emerald-400 transition-colors shrink-0 cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
