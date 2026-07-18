"use client";

import { useState } from "react";
import { CopyButton, ToolButton, ToolCallout, ToolField, ToolInput } from "../components/tool-ui";

interface DescriptionOption {
  description: string;
  length: number;
  approach: string;
}

export function MetaDescriptionForm() {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [descriptions, setDescriptions] = useState<DescriptionOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  const generateDescriptions = async () => {
    if (!topic) {
      setError("Please enter a topic");
      return;
    }

    setIsLoading(true);
    setError("");
    setDescriptions([]);

    try {
      const response = await fetch("/api/tools/generate-meta-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords: keywords || undefined }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) setRemainingRequests(parseInt(remaining));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate descriptions");
      }

      const data = await response.json();
      setDescriptions(data.descriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getLengthColor = (length: number) => {
    if (length >= 150 && length <= 160) return "text-emerald-600 dark:text-emerald-400";
    if (length > 160 && length <= 170) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{remainingRequests} requests remaining this minute</p>
      )}

      <ToolField label="Page Topic" htmlFor="meta-topic" required>
        <ToolInput
          id="meta-topic"
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g., Complete Guide to Content Marketing Strategy"
          disabled={isLoading}
        />
      </ToolField>

      <ToolField label="Target Keywords (Optional)" htmlFor="meta-keywords" hint="Comma-separated keywords to include">
        <ToolInput
          id="meta-keywords"
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="e.g., content marketing, SEO, digital strategy"
          disabled={isLoading}
        />
      </ToolField>

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      <ToolButton onClick={generateDescriptions} loading={isLoading} className="w-full">
        {isLoading ? "Generating Descriptions..." : "Generate Meta Descriptions"}
      </ToolButton>

      {descriptions.length > 0 && (
        <div className="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Generated Descriptions</h3>
          {descriptions.map((option, index) => (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-neutral-700"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="flex-1 text-neutral-900 dark:text-white">{option.description}</p>
                <CopyButton value={option.description} className="shrink-0" />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className={`font-medium ${getLengthColor(option.length)}`}>{option.length} characters</span>
                <span className="text-neutral-500 dark:text-neutral-400">{option.approach}</span>
              </div>
            </div>
          ))}
          <ToolCallout variant="tip">
            <strong>Tip:</strong> Optimal meta description length is 150-160 characters. Longer descriptions may be
            truncated in search results.
          </ToolCallout>
        </div>
      )}
    </div>
  );
}
