"use client";

import { Star } from "lucide-react";
import { trackAdEvent } from "../lib/trackAdEvent";
import { useGithubStarCount } from "../lib/useGithubStarCount";

export function GitHubStarButton() {
  const { starCount, isLoading } = useGithubStarCount();

  return (
    <div className="mb-6 md:mb-8" onClick={() => trackAdEvent("github")}>
      <a
        href="https://github.com/rybbit-io/rybbit"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 bg-neutral-800/70 hover:bg-neutral-700/70 border border-neutral-600/70 hover:border-neutral-700/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:-translate-y-1 shadow-xl shadow-neutral-900/50 hover:shadow-2xl hover:shadow-neutral-800/60 backdrop-blur-sm ring-1 ring-white/10 hover:ring-white/20"
      >
        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.3.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <span>Star us!</span>
        <div className="flex items-center gap-1 ml-1 mr-0.5 py-0.5 rounded-full text-xs">
          <Star className="w-3 h-3 text-yellow-400 fill-current" />
          {isLoading ? (
            <div className="w-7.5 h-3.5 bg-neutral-600 rounded-sm animate-pulse"></div>
          ) : (
            starCount && <span className="h-3.5 w-7.5">{starCount}</span>
          )}
        </div>
      </a>
    </div>
  );
}
