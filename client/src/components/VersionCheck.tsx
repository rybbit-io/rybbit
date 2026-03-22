"use client";

import { useEffect } from "react";
import { useExtracted } from "next-intl";
import { toast } from "@/components/ui/sonner";

import { IS_CLOUD } from "../lib/const";
import packageJson from "../../package.json";
import { X } from "lucide-react";
import { Button } from "./ui/button";

export function VersionCheck() {
  const t = useExtracted();
  useEffect(() => {
    if (IS_CLOUD) return;
    if (sessionStorage.getItem("version-check-done")) return;

    sessionStorage.setItem("version-check-done", "1");

    fetch("https://app.rybbit.io/api/version")
      .then((res) => res.json())
      .then((data: { version: string }) => {
        const latest = data.version;
        const current = packageJson.version;

        if (latest && latest !== current && isNewer(latest, current)) {
          toast.custom(
            (toastInstance) => (
              <div
                style={{
                  opacity: toastInstance.visible ? 1 : 0,
                  transform: toastInstance.visible ? "translateY(0)" : "translateY(-8px)",
                  transition: "opacity 200ms ease, transform 200ms ease",
                }}
                className="flex items-center gap-3 bg-white dark:bg-neutral-850 border border-neutral-150 dark:border-neutral-850 rounded-lg shadow-lg py-2 px-3 text-sm"
              >
                <span>
                  {t("Rybbit v{latest} is available (you're on v{current})", { latest, current })}
                </span>
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
      })
      .catch(() => {
        // Silently ignore - user may be offline or app.rybbit.io unreachable
      });
  }, []);

  return null;
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
