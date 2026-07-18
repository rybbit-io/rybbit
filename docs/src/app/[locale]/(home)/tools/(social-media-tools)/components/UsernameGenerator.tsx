"use client";

import { useState } from "react";
import type { UsernameGeneratorPlatformConfig } from "./username-generator-platform-configs";
import {
  CopyButton,
  ToolButton,
  ToolCallout,
  ToolField,
  ToolInput,
  ToolResultDivider,
} from "../../components/tool-ui";

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

  return (
    <div className="space-y-6">
      <ToolField label="Your Name or Brand" htmlFor="username-name">
        <ToolInput
          id="username-name"
          type="text"
          placeholder="Enter your name, brand, or nickname"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={100}
        />
      </ToolField>

      <ToolField label="Interests or Keywords (Optional)" htmlFor="username-interests">
        <ToolInput
          id="username-interests"
          type="text"
          placeholder="e.g., gaming, tech, art, music"
          value={interests}
          onChange={e => setInterests(e.target.value)}
          maxLength={100}
        />
      </ToolField>

      <div className="flex items-center gap-3">
        <input
          id="username-include-numbers"
          type="checkbox"
          className="size-4 rounded border-neutral-300 text-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900"
          checked={includeNumbers}
          onChange={e => setIncludeNumbers(e.target.checked)}
        />
        <label
          htmlFor="username-include-numbers"
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Include numbers in usernames
        </label>
      </div>

      <ToolButton
        onClick={generateUsernames}
        loading={isLoading}
        disabled={!name.trim() && !interests.trim()}
        className="w-full"
      >
        {isLoading ? "Generating Usernames..." : "Generate Usernames"}
      </ToolButton>

      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {remainingRequests} requests remaining this minute
        </p>
      )}

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {usernames.length > 0 && (
        <ToolResultDivider>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Generated Usernames</h3>
          {usernames.map((username, index) => (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex-1 font-mono text-lg font-medium text-neutral-900 dark:text-white">
                  {platform.usernamePrefix}
                  {username}
                </p>
                <CopyButton value={username} className="shrink-0" />
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {username.length} characters
                {platform.characterLimit && ` / ${platform.characterLimit} limit`}
              </p>
            </div>
          ))}
        </ToolResultDivider>
      )}

      <ToolCallout variant="info" title="Platform Guidelines">
        <div className="space-y-2">
          <p>{platform.contextGuidelines}</p>
          <p className="text-xs">
            <strong className="font-semibold">Allowed characters:</strong> {platform.allowedCharacters}
          </p>
          {platform.characterLimit && (
            <p className="text-xs">
              <strong className="font-semibold">Character limit:</strong> {platform.characterLimit} characters
            </p>
          )}
        </div>
      </ToolCallout>
    </div>
  );
}
