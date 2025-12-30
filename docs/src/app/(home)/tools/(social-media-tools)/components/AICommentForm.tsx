"use client";

import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import type { CommentPlatformConfig } from "./comment-platform-configs";

interface AICommentFormProps {
  platform: CommentPlatformConfig;
}

const toneOptions = [
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  {
    value: "professional",
    label: "Professional",
    description: "Polished and business-appropriate",
  },
  {
    value: "humorous",
    label: "Humorous",
    description: "Light-hearted and funny",
  },
  {
    value: "supportive",
    label: "Supportive",
    description: "Encouraging and empathetic",
  },
  {
    value: "inquisitive",
    label: "Inquisitive",
    description: "Curious and question-asking",
  },
  {
    value: "critical",
    label: "Critical",
    description: "Thoughtfully analytical",
  },
];

const lengthOptions = [
  { value: "short", label: "Short", description: "~100 characters" },
  { value: "medium", label: "Medium", description: "~250 characters" },
  { value: "long", label: "Long", description: "~500 characters" },
];

export default function AICommentForm({ platform }: AICommentFormProps) {
  const [originalContent, setOriginalContent] = useState("");
  const [tone, setTone] = useState("friendly");
  const [length, setLength] = useState("medium");
  const [comments, setComments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(
    null
  );

  const generateComments = async () => {
    if (!originalContent.trim()) {
      setError("Please paste the content you want to comment on");
      return;
    }

    setIsLoading(true);
    setError("");
    setComments([]);

    try {
      const response = await fetch("/api/tools/generate-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalContent: originalContent.trim(),
          tone,
          length,
          platform: platform.id,
        }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) {
        setRemainingRequests(parseInt(remaining));
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate comments");
      }

      const data = await response.json();
      setComments(data.comments);
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
          htmlFor="original-content"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Original Content
        </label>
        <textarea
          id="original-content"
          rows={6}
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          placeholder={`Paste the ${platform.name} post or content you want to comment on...`}
          value={originalContent}
          onChange={(e) => setOriginalContent(e.target.value)}
          maxLength={platform.characterLimit || 10000}
        />
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {originalContent.length}
          {platform.characterLimit && ` / ${platform.characterLimit}`}{" "}
          characters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="tone"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            Tone
          </label>
          <select
            id="tone"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            {toneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="length"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            Length
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
      </div>

      <button
        onClick={generateComments}
        disabled={isLoading || !originalContent.trim()}
        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Comments...
          </>
        ) : (
          "Generate Comments"
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

      {comments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Generated Comments
          </h3>
          {comments.map((comment, index) => (
            <div
              key={index}
              className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="flex-1 text-neutral-900 dark:text-white whitespace-pre-wrap">
                  {comment}
                </p>
                <button
                  onClick={() => copyToClipboard(comment, index)}
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
                {comment.length} characters
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <strong>Platform Context:</strong> {platform.contextGuidelines}
        </p>
      </div>
    </div>
  );
}
