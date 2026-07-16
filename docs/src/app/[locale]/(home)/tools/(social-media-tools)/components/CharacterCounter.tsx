"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Copy, Check } from "lucide-react";
import type { CharacterCounterPlatformConfig } from "./character-counter-platform-configs";

interface CharacterCounterProps {
  platform: CharacterCounterPlatformConfig;
}

export function CharacterCounter({ platform }: CharacterCounterProps) {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

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
    if (isNearLimit) return "text-orange-600 dark:text-orange-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  const getProgressBarColor = () => {
    if (isOverLimit) return "bg-red-500";
    if (isNearLimit) return "bg-orange-500";
    return "bg-emerald-500";
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Platform Info */}
      <div className="mb-8 p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 mt-0.5 flex-shrink-0">
            {isOverLimit ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">
              {platform.name} {platform.contentType} Limit
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
              <strong>Character limit:</strong> {platform.characterLimit.toLocaleString()} characters
              {platform.recommendedLimit && (
                <span className="ml-2 text-neutral-500">
                  (recommended: {platform.recommendedLimit} characters)
                </span>
              )}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {platform.countingRules}
            </p>
          </div>
        </div>
      </div>

      {/* Text Area */}
      <div className="mb-6">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Type or paste your ${platform.contentType} here...`}
            rows={10}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent resize-none text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
          {text && (
            <button
              onClick={copyText}
              className="absolute top-3 right-3 px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-md transition-colors duration-200 flex items-center gap-2"
            >
              {copied ? (
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
          )}
        </div>
      </div>

      {/* Character Count Stats */}
      <div className="space-y-4 mb-6">
        {/* Main Counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className={`text-3xl font-bold ${getStatusColor()}`}>
                {characterCount.toLocaleString()}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                characters
              </p>
            </div>
            <div className="h-12 w-px bg-neutral-200 dark:bg-neutral-800" />
            <div>
              <p className={`text-3xl font-bold ${getStatusColor()}`}>
                {remaining >= 0 ? remaining.toLocaleString() : `+${Math.abs(remaining).toLocaleString()}`}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {remaining >= 0 ? "remaining" : "over limit"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-1">
              <strong>Without spaces:</strong> {characterCountNoSpaces.toLocaleString()}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              <strong>Progress:</strong> {percentage.toFixed(1)}%
            </p>
          </div>
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
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                Over Character Limit
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Your {platform.contentType} exceeds {platform.name}'s {platform.characterLimit.toLocaleString()}-character
                limit by {Math.abs(remaining).toLocaleString()} characters. Please shorten your text.
              </p>
            </div>
          </div>
        )}

        {!isOverLimit && isNearLimit && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                Approaching Character Limit
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                You're using {percentage.toFixed(1)}% of {platform.name}'s character limit. Only{" "}
                {remaining.toLocaleString()} characters remaining.
              </p>
            </div>
          </div>
        )}

        {!isOverLimit &&
          !isNearLimit &&
          platform.recommendedLimit &&
          isAtRecommended && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  Above Recommended Length
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  While you're within the limit, posts under {platform.recommendedLimit} characters
                  typically perform better on {platform.name}.
                </p>
              </div>
            </div>
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
