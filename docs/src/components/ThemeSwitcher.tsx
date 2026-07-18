"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-11 w-14 rounded-md bg-neutral-200 dark:bg-neutral-800" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-11 w-14 items-center justify-center gap-0.5 rounded-md bg-neutral-200 p-1 transition-colors hover:bg-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:bg-neutral-800 dark:hover:bg-neutral-700"
      aria-label="Toggle theme"
    >
      <div className={`rounded-sm p-1.5 transition-colors ${!isDark ? "bg-white" : "bg-transparent"}`}>
        <Sun className={`w-3 h-3 ${!isDark ? "text-neutral-900" : "text-neutral-500"}`} />
      </div>
      <div
        className={`rounded-sm p-1.5 transition-colors ${
          isDark ? "bg-neutral-900 dark:bg-neutral-700" : "bg-transparent"
        }`}
      >
        <Moon className={`w-3 h-3 ${isDark ? "text-white" : "text-neutral-500"}`} />
      </div>
    </button>
  );
}
