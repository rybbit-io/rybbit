"use client";

import { Star } from "lucide-react";
import { trackAdEvent } from "../lib/trackAdEvent";
import { useGithubStarCount } from "../lib/useGithubStarCount";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export function GitHubStarButton() {
  const { starCount, isLoading } = useGithubStarCount();

  const { systemTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    if (systemTheme && resolvedTheme && window?.rybbit?.event) {
      window.rybbit.event("theme", {
        resolvedTheme,
        systemTheme,
      });
    }
  }, [resolvedTheme, systemTheme]);

  return (
    <a
      href="https://github.com/rybbit-io/rybbit"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackAdEvent("github")}
      className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
    >
      <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.3.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
      {/* <span className="h-3.5 w-px bg-neutral-300 dark:bg-neutral-700" aria-hidden="true" /> */}
      <span className="flex min-w-10 items-center justify-end gap-1 tabular-nums">
        <Star className="size-3 fill-current text-amber-500 dark:text-amber-400" aria-hidden="true" />
        {isLoading ? (
          <span className="h-3 w-7 animate-pulse rounded-sm bg-neutral-300 dark:bg-neutral-700" />
        ) : (
          starCount && <span>{starCount}</span>
        )}
      </span>
    </a>
  );
}
