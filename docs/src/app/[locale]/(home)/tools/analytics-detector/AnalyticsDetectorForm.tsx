"use client";

import { Shield } from "lucide-react";
import { useState } from "react";
import { ToolButton, ToolCallout, ToolField, ToolInput } from "../components/tool-ui";

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
        return "text-amber-600 dark:text-amber-500";
      case "high":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-neutral-600 dark:text-neutral-400";
    }
  };

  return (
    <div className="space-y-6">
      <ToolField label="Website URL" htmlFor="detector-url" required hint="Enter the full URL including https://">
        <ToolInput
          id="detector-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={isLoading}
          onKeyDown={(e) => e.key === "Enter" && detectAnalytics()}
        />
      </ToolField>

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      <ToolButton onClick={detectAnalytics} loading={isLoading} className="w-full">
        {isLoading ? "Analyzing Website..." : "Detect Analytics"}
      </ToolButton>

      {result && (
        <div className="space-y-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          {/* Summary */}
          <ToolCallout variant="info" icon={Shield} title="Privacy Score">
            <p className={`text-2xl font-semibold ${getPrivacyScoreColor(result.privacyScore)}`}>{result.privacyScore}</p>
            <p className="mt-2">{result.summary}</p>
          </ToolCallout>

          {/* Detected Platforms */}
          {result.platforms.length > 0 ? (
            <div>
              <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-white">
                Detected Platforms ({result.platforms.length})
              </h3>
              <div className="space-y-3">
                {result.platforms.map((platform, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <h4 className="font-semibold text-neutral-900 dark:text-white">{platform.name}</h4>
                      <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {platform.category}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-300">{platform.privacy}</p>
                    {platform.identifier && (
                      <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">ID: {platform.identifier}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-6 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="text-neutral-600 dark:text-neutral-400">No analytics platforms detected on this website.</p>
            </div>
          )}
        </div>
      )}

      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{remainingRequests} requests remaining this minute</p>
      )}
    </div>
  );
}
