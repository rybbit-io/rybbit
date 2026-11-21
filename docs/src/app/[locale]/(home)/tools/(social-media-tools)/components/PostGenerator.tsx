"use client";

import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
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
          What do you want to post about?
        </label>
        <textarea
          id="topic"
          rows={4}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          placeholder={`Describe your post topic or key message (e.g., "Sharing lessons learned from building a startup" or "Tips for productivity")`}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={1000}
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {topic.length} / 1000 characters
        </p>
      </div>

      <div>
        <label
          htmlFor="style"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Post Style
        </label>
        <select
          id="style"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          {platform.recommendedStyles.map((styleOption) => (
            <option key={styleOption} value={styleOption}>
              {styleOption}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Choose a style that fits your content and audience
        </p>
      </div>

      <div>
        <label
          htmlFor="additionalContext"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Additional Context (Optional)
        </label>
        <textarea
          id="additionalContext"
          rows={2}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          placeholder="Any specific details, CTAs, or hashtags you want to include"
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          maxLength={500}
        />
      </div>

      <button
        onClick={generatePosts}
        disabled={isLoading || !topic.trim()}
        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Posts...
          </>
        ) : (
          "Generate Posts"
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

      {posts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Generated Posts
          </h3>
          {posts.map((post, index) => (
            <div
              key={index}
              className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="flex-1 text-neutral-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {post}
                </p>
                <button
                  onClick={() => copyToClipboard(post, index)}
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
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {post.length} characters
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
