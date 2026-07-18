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

  return (
    <div className="space-y-6">
      <ToolField
        label="Original Content"
        htmlFor="comment-original-content"
        hint={
          <>
            {originalContent.length}
            {platform.characterLimit && ` / ${platform.characterLimit}`}{" "}
            characters
          </>
        }
      >
        <ToolTextarea
          id="comment-original-content"
          rows={6}
          className="resize-y"
          placeholder={`Paste the ${platform.name} post or content you want to comment on...`}
          value={originalContent}
          onChange={(e) => setOriginalContent(e.target.value)}
          maxLength={platform.characterLimit || 10000}
        />
      </ToolField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ToolField label="Tone" htmlFor="comment-tone">
          <ToolSelect
            id="comment-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            {toneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </ToolSelect>
        </ToolField>

        <ToolField label="Length" htmlFor="comment-length">
          <ToolSelect
            id="comment-length"
            value={length}
            onChange={(e) => setLength(e.target.value)}
          >
            {lengthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </ToolSelect>
        </ToolField>
      </div>

      <ToolButton
        onClick={generateComments}
        loading={isLoading}
        disabled={!originalContent.trim()}
        className="w-full"
      >
        {isLoading ? "Generating Comments..." : "Generate Comments"}
      </ToolButton>

      {remainingRequests !== null && (
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          {remainingRequests} requests remaining this minute
        </p>
      )}

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {comments.length > 0 && (
        <div className="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Generated Comments
          </h3>
          {comments.map((comment, index) => (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="flex-1 whitespace-pre-wrap text-neutral-900 dark:text-white">
                  {comment}
                </p>
                <CopyButton value={comment} className="shrink-0" />
              </div>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {comment.length} characters
              </p>
            </div>
          ))}
        </div>
      )}

      <ToolCallout variant="info" title="Platform Context">
        {platform.contextGuidelines}
      </ToolCallout>
    </div>
  );
}
