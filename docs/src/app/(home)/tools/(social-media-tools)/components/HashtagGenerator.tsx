"use client";

import { useState } from "react";
import { Hash, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import type { HashtagGeneratorPlatformConfig } from "./hashtag-generator-platform-configs";

interface HashtagGeneratorProps {
  platform: HashtagGeneratorPlatformConfig;
}

export function HashtagGenerator({ platform }: HashtagGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [strategy, setStrategy] = useState(platform.hashtagStrategies[0]);
  const [keywords, setKeywords] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    limit: number;
    remaining: number;
    reset: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic or content description");
      return;
    }

    setLoading(true);
    setError("");
    setHashtags([]);

    try {
      const response = await fetch("/api/tools/generate-hashtag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          strategy,
          keywords: keywords.trim() || undefined,
          platform: platform.id,
          maxHashtags: platform.maxHashtags,
          characterLimit: platform.characterLimit,
        }),
      });

      // Extract rate limit headers
      const limit = response.headers.get("X-RateLimit-Limit");
      const remaining = response.headers.get("X-RateLimit-Remaining");
      const reset = response.headers.get("X-RateLimit-Reset");

      if (limit && remaining && reset) {
        setRateLimit({
          limit: parseInt(limit),
          remaining: parseInt(remaining),
          reset,
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate hashtags");
      }

      setHashtags(data.hashtags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyHashtags = async (hashtagSet: string, index: number) => {
    try {
      await navigator.clipboard.writeText(hashtagSet);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const copyAllHashtags = async () => {
    try {
      await navigator.clipboard.writeText(hashtags.join(" "));
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Context Guidelines */}
      <div className="mb-8 p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Hash className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
              {platform.name} Hashtag Guidelines
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {platform.contextGuidelines}
            </p>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <div className="space-y-6 mb-8">
        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Topic or Content Description *
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={`Describe your ${platform.name} content...`}
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent resize-none text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Strategy Selector */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Hashtag Strategy
          </label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white"
          >
            {platform.hashtagStrategies.map((strat) => (
              <option key={strat} value={strat}>
                {strat}
              </option>
            ))}
          </select>
        </div>

        {/* Keywords (Optional) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Niche/Keywords (Optional)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g., fitness, vegan, startup, travel"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Hash className="w-5 h-5" />
              Generate Hashtags
            </>
          )}
        </button>
      </div>

      {/* Rate Limit Info */}
      {rateLimit && (
        <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Rate limit: {rateLimit.remaining} of {rateLimit.limit} requests remaining
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Generated Hashtags */}
      {hashtags.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Generated Hashtag Sets
            </h3>
            <button
              onClick={copyAllHashtags}
              className="px-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              {copiedIndex === -1 ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy All
                </>
              )}
            </button>
          </div>

          {hashtags.map((hashtagSet, index) => (
            <div
              key={index}
              className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Set {index + 1}
                </p>
                <button
                  onClick={() => copyHashtags(hashtagSet, index)}
                  className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-md transition-colors duration-200 flex items-center gap-2 flex-shrink-0"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-neutral-900 dark:text-white break-words">
                {hashtagSet}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                {hashtagSet.split(/\s+/).filter(Boolean).length} hashtags • {hashtagSet.length} characters
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
