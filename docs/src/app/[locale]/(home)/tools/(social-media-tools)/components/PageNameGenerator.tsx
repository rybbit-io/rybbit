"use client";

import { useState } from "react";
import type { PageNamePlatformConfig } from "./page-name-platform-configs";
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

  return (
    <div className="space-y-6">
      <ToolField
        label={`${platform.pageType} Topic/Purpose`}
        htmlFor="pagename-topic"
        hint={`${topic.length} / 500 characters`}
      >
        <ToolTextarea
          id="pagename-topic"
          rows={3}
          className="resize-y"
          placeholder={`Describe what your ${platform.pageType.toLowerCase()} is about (e.g., "A gaming community for strategy game players" or "Tech startup focused on AI tools")`}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          maxLength={500}
        />
      </ToolField>

      <ToolField label="Keywords (Optional)" htmlFor="pagename-keywords">
        <ToolInput
          id="pagename-keywords"
          type="text"
          placeholder="Keywords to include (e.g., gaming, tech, creative)"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          maxLength={100}
        />
      </ToolField>

      <ToolField label="Name Length" htmlFor="pagename-length">
        <ToolSelect id="pagename-length" value={length} onChange={e => setLength(e.target.value)}>
          {lengthOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      <ToolButton onClick={generateNames} loading={isLoading} disabled={!topic.trim()} className="w-full">
        {isLoading ? "Generating Names..." : "Generate Names"}
      </ToolButton>

      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {remainingRequests} requests remaining this minute
        </p>
      )}

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {names.length > 0 && (
        <ToolResultDivider>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Generated {platform.pageType} Names
          </h3>
          {names.map((name, index) => (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex-1 text-lg font-medium text-neutral-900 dark:text-white">{name}</p>
                <CopyButton value={name} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {name.length} characters
                {platform.characterLimit && ` / ${platform.characterLimit} limit`}
              </p>
            </div>
          ))}
        </ToolResultDivider>
      )}

      <ToolCallout variant="info" title="Platform Guidelines">
        {platform.contextGuidelines}
      </ToolCallout>
    </div>
  );
}
