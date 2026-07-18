"use client";

import { useState } from "react";
import { CopyButton, ToolCallout, ToolStat, ToolTextarea } from "../../components/tool-ui";
import type { CharacterCounterPlatformConfig } from "./character-counter-platform-configs";

interface CharacterCounterProps {
  platform: CharacterCounterPlatformConfig;
}

export function CharacterCounter({ platform }: CharacterCounterProps) {
  const [text, setText] = useState("");

  const characterCount = text.length;
  const characterCountNoSpaces = text.replace(/\s/g, "").length;
  const remaining = platform.characterLimit - characterCount;
  const percentage = (characterCount / platform.characterLimit) * 100;

  // Determine status
  const isOverLimit = characterCount > platform.characterLimit;
  const isNearLimit = percentage >= 90 && !isOverLimit;
  const isAtRecommended =
    platform.recommendedLimit && characterCount > platform.recommendedLimit;

  const getStatusColor = () => {
    if (isOverLimit) return "text-red-600 dark:text-red-400";
    if (isNearLimit) return "text-amber-600 dark:text-amber-500";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getProgressBarColor = () => {
    if (isOverLimit) return "bg-red-500";
    if (isNearLimit) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Platform Info */}
      <ToolCallout
        variant={isOverLimit ? "error" : "success"}
        title={`${platform.name} ${platform.contentType} Limit`}
        className="mb-8"
      >
        <p className="mb-2">
          <strong>Character limit:</strong> {platform.characterLimit.toLocaleString()} characters
          {platform.recommendedLimit && (
            <span className="ml-2 text-neutral-500 dark:text-neutral-400">
              (recommended: {platform.recommendedLimit} characters)
            </span>
          )}
        </p>
        <p>{platform.countingRules}</p>
      </ToolCallout>

      {/* Text Area */}
      <div className="mb-6 space-y-2">
        <ToolTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Type or paste your ${platform.contentType} here...`}
          rows={10}
          className="resize-none"
        />
        {text && (
          <div className="flex justify-end">
            <CopyButton value={text} label="Copy" copiedLabel="Copied!" />
          </div>
        )}
      </div>

      {/* Character Count Stats */}
      <div className="space-y-4 mb-6">
        {/* Main Counter */}
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className={`text-3xl font-semibold ${getStatusColor()}`}>
              {characterCount.toLocaleString()}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              characters
            </p>
          </div>
          <div className="h-12 w-px bg-neutral-200 dark:bg-neutral-800" />
          <div>
            <p className={`text-3xl font-semibold ${getStatusColor()}`}>
              {remaining >= 0 ? remaining.toLocaleString() : `+${Math.abs(remaining).toLocaleString()}`}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {remaining >= 0 ? "remaining" : "over limit"}
            </p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <ToolStat label="Without spaces" value={characterCountNoSpaces.toLocaleString()} />
          <ToolStat label="Progress" value={`${percentage.toFixed(1)}%`} />
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Status Messages */}
        {isOverLimit && (
          <ToolCallout variant="error" title="Over Character Limit">
            Your {platform.contentType} exceeds {platform.name}'s {platform.characterLimit.toLocaleString()}-character
            limit by {Math.abs(remaining).toLocaleString()} characters. Please shorten your text.
          </ToolCallout>
        )}

        {!isOverLimit && isNearLimit && (
          <ToolCallout variant="warning" title="Approaching Character Limit">
            You're using {percentage.toFixed(1)}% of {platform.name}'s character limit. Only{" "}
            {remaining.toLocaleString()} characters remaining.
          </ToolCallout>
        )}

        {!isOverLimit &&
          !isNearLimit &&
          platform.recommendedLimit &&
          isAtRecommended && (
            <ToolCallout variant="info" title="Above Recommended Length">
              While you're within the limit, posts under {platform.recommendedLimit} characters
              typically perform better on {platform.name}.
            </ToolCallout>
          )}
      </div>

      {/* Best Practices */}
      {platform.bestPractices.length > 0 && (
        <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
            Best Practices for {platform.name}
          </h3>
          <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            {platform.bestPractices.map((practice, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                <span>{practice}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
