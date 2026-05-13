"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { toast } from "@/components/ui/sonner";

import { IS_CLOUD } from "../lib/const";
import packageJson from "../../package.json";
import { X } from "lucide-react";
import { Button } from "./ui/button";

const VERSION_CHECK_DONE_KEY = "version-check-done";

export function VersionCheck() {
  const t = useExtracted();

  const [shouldCheckVersion] = useState(() => {
    if (IS_CLOUD || typeof window === "undefined") return false;
    return !sessionStorage.getItem(VERSION_CHECK_DONE_KEY);
  });

  const { data: latestVersion } = useQuery({
    queryKey: ["version-check"],
    queryFn: fetchLatestVersion,
    enabled: shouldCheckVersion,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!shouldCheckVersion || !latestVersion) return;

    const current = packageJson.version;

    if (latestVersion !== current && isNewer(latestVersion, current)) {
      toast.custom(
        toastInstance => (
          <div
            style={{
              opacity: toastInstance.visible ? 1 : 0,
              transform: toastInstance.visible ? "translateY(0)" : "translateY(-8px)",
              transition: "opacity 200ms ease, transform 200ms ease",
            }}
            className="flex items-center gap-3 bg-white dark:bg-neutral-850 border border-neutral-150 dark:border-neutral-850 rounded-lg shadow-lg py-2 px-3 text-sm"
          >
            <span>{t("Rybbit v{latest} is available (you're on v{current})", { latest: latestVersion, current })}</span>
            <a
              href="https://rybbit.com/docs/managing-your-installation#updating-your-installation"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="success" size="sm">
                {t("Upgrade")}
              </Button>
            </a>
            <button
              onClick={() => toast.dismiss(toastInstance.id)}
              className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <X size={16} />
            </button>
          </div>
        ),
        { duration: 10000 }
      );
    }
  }, [latestVersion, shouldCheckVersion, t]);

  return null;
}

async function fetchLatestVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  sessionStorage.setItem(VERSION_CHECK_DONE_KEY, "1");

  try {
    const res = await fetch("https://app.rybbit.io/api/version");
    if (!res.ok) return null;

    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    // Silently ignore - user may be offline or app.rybbit.io unreachable
    return null;
  }
}

function isNewer(latest: string, current: string): boolean {
  const l = latest.split(".").map(Number);
  const c = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}
