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
    return <div className="bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-full w-[46px] h-[24px]" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-full flex items-center gap-0.5 transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700"
      aria-label="Toggle theme"
    >
      <div className={`p-1 rounded-full transition-all ${!isDark ? "bg-white shadow-sm" : "bg-transparent"}`}>
        <Sun className={`w-3 h-3 ${!isDark ? "text-neutral-900" : "text-neutral-500"}`} />
      </div>
      <div
        className={`p-1 rounded-full transition-all ${
          isDark ? "bg-neutral-900 dark:bg-neutral-700 shadow-sm" : "bg-transparent"
        }`}
      >
        <Moon className={`w-3 h-3 ${isDark ? "text-white" : "text-neutral-500"}`} />
      </div>
    </button>
  );
}
