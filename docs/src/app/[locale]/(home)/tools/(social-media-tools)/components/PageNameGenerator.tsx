"use client";

import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import type { PageNamePlatformConfig } from "./page-name-platform-configs";

interface PageNameGeneratorProps {
  platform: PageNamePlatformConfig;
}

const lengthOptions = [
  { value: "short", label: "Short", description: "1-2 words, concise" },
  { value: "medium", label: "Medium", description: "2-4 words, balanced" },
  { value: "long", label: "Long", description: "4-6 words, descriptive" },
];

export default function PageNameGenerator({
  platform,
}: PageNameGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("medium");
  const [names, setNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(
    null
  );

  const generateNames = async () => {
    if (!topic.trim()) {
      setError(`Please describe your ${platform.pageType.toLowerCase()}`);
      return;
    }

    setIsLoading(true);
    setError("");
    setNames([]);

    try {
      const response = await fetch("/api/tools/generate-page-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          keywords: keywords.trim(),
          length,
          platform: platform.id,
          pageType: platform.pageType,
          characterLimit: platform.characterLimit,
        }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) {
        setRemainingRequests(parseInt(remaining));
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate names");
      }

      const data = await response.json();
      setNames(data.names);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="topic"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          {platform.pageType} Topic/Purpose
        </label>
        <textarea
          id="topic"
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          placeholder={`Describe what your ${platform.pageType.toLowerCase()} is about (e.g., "A gaming community for strategy game players" or "Tech startup focused on AI tools")`}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={500}
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {topic.length} / 500 characters
        </p>
      </div>

      <div>
        <label
          htmlFor="keywords"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Keywords (Optional)
        </label>
        <input
          id="keywords"
          type="text"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Keywords to include (e.g., gaming, tech, creative)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          maxLength={100}
        />
      </div>

      <div>
        <label
          htmlFor="length"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Name Length
        </label>
        <select
          id="length"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        >
          {lengthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={generateNames}
        disabled={isLoading || !topic.trim()}
        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Names...
          </>
        ) : (
          "Generate Names"
        )}
      </button>

      {remainingRequests !== null && (
        <p className="text-sm text-center text-neutral-600 dark:text-neutral-400">
          {remainingRequests} requests remaining this minute
        </p>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {names.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Generated {platform.pageType} Names
          </h3>
          {names.map((name, index) => (
            <div
              key={index}
              className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex-1 text-lg font-medium text-neutral-900 dark:text-white">
                  {name}
                </p>
                <button
                  onClick={() => copyToClipboard(name, index)}
                  className="flex-shrink-0 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedIndex === index ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {name.length} characters
                {platform.characterLimit &&
                  ` / ${platform.characterLimit} limit`}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <strong>Platform Guidelines:</strong> {platform.contextGuidelines}
        </p>
      </div>
    </div>
  );
}
