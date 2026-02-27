"use client";

import { AlertCircle, Loader2, Shield } from "lucide-react";
import { useState } from "react";

interface Platform {
  name: string;
  category: string;
  privacy: string;
  identifier?: string;
}

interface DetectionResult {
  platforms: Platform[];
  summary: string;
  privacyScore: string;
}

export function AnalyticsDetectorForm() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  const detectAnalytics = async () => {
    if (!url) {
      setError("Please enter a website URL");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/tools/detect-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) setRemainingRequests(parseInt(remaining));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to detect analytics");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getPrivacyScoreColor = (score: string) => {
    switch (score.toLowerCase()) {
      case "low":
        return "text-emerald-600 dark:text-emerald-400";
      case "medium":
        return "text-orange-600 dark:text-orange-400";
      case "high":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-neutral-600 dark:text-neutral-400";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
          Website URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={isLoading}
          onKeyDown={(e) => e.key === "Enter" && detectAnalytics()}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Enter the full URL including https://
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
        </div>
      )}

      <button
        onClick={detectAnalytics}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing Website...
          </>
        ) : (
          "Detect Analytics"
        )}
      </button>

      {result && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
          {/* Summary */}
          <div className="p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Privacy Score
                </h3>
                <p className={`text-2xl font-bold ${getPrivacyScoreColor(result.privacyScore)}`}>
                  {result.privacyScore}
                </p>
              </div>
            </div>
            <p className="text-sm text-blue-900 dark:text-blue-200">{result.summary}</p>
          </div>

          {/* Detected Platforms */}
          {result.platforms.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Detected Platforms ({result.platforms.length})
              </h3>
              <div className="space-y-3">
                {result.platforms.map((platform, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        {platform.name}
                      </h4>
                      <span className="px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full">
                        {platform.category}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
                      {platform.privacy}
                    </p>
                    {platform.identifier && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                        ID: {platform.identifier}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <p className="text-neutral-600 dark:text-neutral-400">
                No analytics platforms detected on this website.
              </p>
            </div>
          )}
        </div>
      )}

      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {remainingRequests} requests remaining this minute
        </p>
      )}
    </div>
  );
}
