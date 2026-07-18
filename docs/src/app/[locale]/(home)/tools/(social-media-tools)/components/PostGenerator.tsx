"use client";

import { useState } from "react";
import {
  CopyButton,
  ToolButton,
  ToolCallout,
  ToolField,
  ToolSelect,
  ToolTextarea,
} from "../../components/tool-ui";
import type { PostGeneratorPlatformConfig } from "./post-generator-platform-configs";

interface PostGeneratorProps {
  platform: PostGeneratorPlatformConfig;
}

export default function PostGenerator({ platform }: PostGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState(platform.recommendedStyles[0]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [posts, setPosts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingRequests, setRemainingRequests] = useState<number | null>(
    null
  );

  const generatePosts = async () => {
    if (!topic.trim()) {
      setError("Please describe what you want to post about");
      return;
    }

    setIsLoading(true);
    setError("");
    setPosts([]);

    try {
      const response = await fetch("/api/tools/generate-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          style,
          additionalContext: additionalContext.trim(),
          platform: platform.id,
          characterLimit: platform.characterLimit,
        }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) {
        setRemainingRequests(parseInt(remaining));
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate posts");
      }

      const data = await response.json();
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToolField
        label="What do you want to post about?"
        htmlFor="post-topic"
        hint={`${topic.length} / 1000 characters`}
      >
        <ToolTextarea
          id="post-topic"
          rows={4}
          className="resize-y"
          placeholder={`Describe your post topic or key message (e.g., "Sharing lessons learned from building a startup" or "Tips for productivity")`}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={1000}
        />
      </ToolField>

      <ToolField
        label="Post Style"
        htmlFor="post-style"
        hint="Choose a style that fits your content and audience"
      >
        <ToolSelect
          id="post-style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          {platform.recommendedStyles.map((styleOption) => (
            <option key={styleOption} value={styleOption}>
              {styleOption}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      <ToolField
        label="Additional Context (Optional)"
        htmlFor="post-additional-context"
      >
        <ToolTextarea
          id="post-additional-context"
          rows={2}
          className="resize-y"
          placeholder="Any specific details, CTAs, or hashtags you want to include"
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          maxLength={500}
        />
      </ToolField>

      <ToolButton
        onClick={generatePosts}
        loading={isLoading}
        disabled={!topic.trim()}
        className="w-full"
      >
        {isLoading ? "Generating Posts..." : "Generate Posts"}
      </ToolButton>

      {remainingRequests !== null && (
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          {remainingRequests} requests remaining this minute
        </p>
      )}

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {posts.length > 0 && (
        <div className="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Generated Posts
          </h3>
          {posts.map((post, index) => (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="flex-1 whitespace-pre-wrap leading-relaxed text-neutral-900 dark:text-white">
                  {post}
                </p>
                <CopyButton value={post} className="shrink-0" />
              </div>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {post.length} characters
                {platform.characterLimit &&
                  ` / ${platform.characterLimit} limit`}
              </p>
            </div>
          ))}
        </div>
      )}

      <ToolCallout variant="info" title="Platform Guidelines">
        {platform.contextGuidelines}
      </ToolCallout>
    </div>
  );
}
