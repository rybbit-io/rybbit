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
    <div className="mb-5" onClick={() => trackAdEvent("github")}>
      <a
        href="https://github.com/rybbit-io/rybbit"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-300 bg-transparent px-2.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
      >
        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.3.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <span>Open source on GitHub</span>
        <div className="ml-1 flex items-center gap-1 border-l border-neutral-300 pl-2 text-xs dark:border-neutral-700">
          <Star className="size-3 fill-current text-amber-400" />
          {isLoading ? (
            <div className="h-3.5 w-8 animate-pulse rounded-sm bg-neutral-300 dark:bg-neutral-700" />
          ) : (
            starCount && <span className="h-3.5 w-9">{starCount}</span>
          )}
        </div>
      </a>
    </div>
  );
}
