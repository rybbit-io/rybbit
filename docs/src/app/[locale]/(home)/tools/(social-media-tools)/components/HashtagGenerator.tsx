"use client";

import { Hash } from "lucide-react";
import { useState } from "react";
import type { HashtagGeneratorPlatformConfig } from "./hashtag-generator-platform-configs";
import {
  CopyButton,
  ToolButton,
  ToolCallout,
  ToolField,
  ToolInput,
  ToolResultDivider,
  ToolSelect,
  ToolTextarea,
} from "../../components/tool-ui";

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

  return (
    <div className="space-y-6">
      <ToolCallout variant="info" icon={Hash} title={`${platform.name} Hashtag Guidelines`}>
        {platform.contextGuidelines}
      </ToolCallout>

      <ToolField label="Topic or Content Description" htmlFor="hashtag-topic" required>
        <ToolTextarea
          id="hashtag-topic"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder={`Describe your ${platform.name} content...`}
          rows={4}
          className="resize-none"
        />
      </ToolField>

      <ToolField label="Hashtag Strategy" htmlFor="hashtag-strategy">
        <ToolSelect id="hashtag-strategy" value={strategy} onChange={e => setStrategy(e.target.value)}>
          {platform.hashtagStrategies.map(strat => (
            <option key={strat} value={strat}>
              {strat}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      <ToolField label="Niche/Keywords (Optional)" htmlFor="hashtag-keywords">
        <ToolInput
          id="hashtag-keywords"
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="e.g., fitness, vegan, startup, travel"
        />
      </ToolField>

      <ToolButton
        onClick={handleGenerate}
        loading={loading}
        disabled={!topic.trim()}
        icon={Hash}
        className="w-full"
      >
        {loading ? "Generating..." : "Generate Hashtags"}
      </ToolButton>

      {rateLimit && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Rate limit: {rateLimit.remaining} of {rateLimit.limit} requests remaining
        </p>
      )}

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {hashtags.length > 0 && (
        <ToolResultDivider>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Generated Hashtag Sets</h3>
            <CopyButton value={hashtags.join(" ")} label="Copy All" copiedLabel="Copied!" className="shrink-0" />
          </div>

          {hashtags.map((hashtagSet, index) => (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Set {index + 1}</p>
                <CopyButton value={hashtagSet} copiedLabel="Copied!" className="shrink-0" />
              </div>
              <p className="break-words text-neutral-900 dark:text-white">{hashtagSet}</p>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {hashtagSet.split(/\s+/).filter(Boolean).length} hashtags • {hashtagSet.length} characters
              </p>
            </div>
          ))}
        </ToolResultDivider>
      )}
    </div>
  );
}
