"use client";

import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import type { UsernameGeneratorPlatformConfig } from "./username-generator-platform-configs";

interface UsernameGeneratorProps {
  platform: UsernameGeneratorPlatformConfig;
}

export default function UsernameGenerator({
  platform,
}: UsernameGeneratorProps) {
  const [name, setName] = useState("");
  const [interests, setInterests] = useState("");
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(
    null
  );

  const generateUsernames = async () => {
    if (!name.trim() && !interests.trim()) {
      setError("Please provide your name or interests");
      return;
    }

    setIsLoading(true);
    setError("");
    setUsernames([]);

    try {
      const response = await fetch("/api/tools/generate-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          interests: interests.trim(),
          includeNumbers,
          platform: platform.id,
          characterLimit: platform.characterLimit,
          minLength: platform.minLength,
        }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) {
        setRemainingRequests(parseInt(remaining));
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate usernames");
      }

      const data = await response.json();
      setUsernames(data.usernames);
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
          htmlFor="name"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Your Name or Brand
        </label>
        <input
          id="name"
          type="text"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Enter your name, brand, or nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
      </div>

      <div>
        <label
          htmlFor="interests"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
        >
          Interests or Keywords (Optional)
        </label>
        <input
          id="interests"
          type="text"
          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g., gaming, tech, art, music"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="includeNumbers"
          type="checkbox"
          className="w-4 h-4 text-emerald-600 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 rounded focus:ring-2 focus:ring-emerald-500"
          checked={includeNumbers}
          onChange={(e) => setIncludeNumbers(e.target.checked)}
        />
        <label
          htmlFor="includeNumbers"
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Include numbers in usernames
        </label>
      </div>

      <button
        onClick={generateUsernames}
        disabled={isLoading || (!name.trim() && !interests.trim())}
        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Usernames...
          </>
        ) : (
          "Generate Usernames"
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

      {usernames.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Generated Usernames
          </h3>
          {usernames.map((username, index) => (
            <div
              key={index}
              className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex-1 text-lg font-medium text-neutral-900 dark:text-white font-mono">
                  {platform.usernamePrefix}
                  {username}
                </p>
                <button
                  onClick={() => copyToClipboard(username, index)}
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
                {username.length} characters
                {platform.characterLimit &&
                  ` / ${platform.characterLimit} limit`}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg space-y-2">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          <strong>Platform Guidelines:</strong> {platform.contextGuidelines}
        </p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          <strong>Allowed characters:</strong> {platform.allowedCharacters}
        </p>
        {platform.characterLimit && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            <strong>Character limit:</strong> {platform.characterLimit}{" "}
            characters
          </p>
        )}
      </div>
    </div>
  );
}
