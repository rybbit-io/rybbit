"use client";

import { AlertCircle, Check, Copy, User } from "lucide-react";
import { useState } from "react";
import type { BioGeneratorPlatformConfig } from "./bio-generator-platform-configs";
import {
  ToolButton,
  ToolCallout,
  ToolField,
  ToolInput,
  ToolResultDivider,
  ToolSelect,
} from "../../components/tool-ui";

interface BioGeneratorProps {
  platform: BioGeneratorPlatformConfig;
}

export function BioGenerator({ platform }: BioGeneratorProps) {
  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [interests, setInterests] = useState("");
  const [tone, setTone] = useState(platform.tones[0]);
  const [bios, setBios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [rateLimit, setRateLimit] = useState<{
    limit: number;
    remaining: number;
    reset: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!name.trim() && !profession.trim()) {
      setError("Please provide at least your name or profession");
      return;
    }

    setLoading(true);
    setError("");
    setBios([]);

    try {
      const response = await fetch("/api/tools/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          profession: profession.trim() || undefined,
          interests: interests.trim() || undefined,
          tone,
          platform: platform.id,
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
        throw new Error(data.error || "Failed to generate bios");
      }

      setBios(data.bios);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyBio = async (bio: string, index: number) => {
    try {
      await navigator.clipboard.writeText(bio);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      <ToolCallout variant="info" icon={User} title={`${platform.name} ${platform.bioType} Guidelines`}>
        {platform.contextGuidelines}
      </ToolCallout>

      <ToolField label="Name or Brand" htmlFor="bio-name" required>
        <ToolInput
          id="bio-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name or brand name"
        />
      </ToolField>

      <ToolField label="Profession or Role" htmlFor="bio-profession">
        <ToolInput
          id="bio-profession"
          type="text"
          value={profession}
          onChange={e => setProfession(e.target.value)}
          placeholder="e.g., Software Engineer, Content Creator, Artist"
        />
      </ToolField>

      <ToolField label="Interests or Focus Areas (Optional)" htmlFor="bio-interests">
        <ToolInput
          id="bio-interests"
          type="text"
          value={interests}
          onChange={e => setInterests(e.target.value)}
          placeholder="e.g., AI, fitness, travel, photography"
        />
      </ToolField>

      <ToolField label="Tone" htmlFor="bio-tone">
        <ToolSelect id="bio-tone" value={tone} onChange={e => setTone(e.target.value)}>
          {platform.tones.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </ToolSelect>
      </ToolField>

      <ToolButton
        onClick={handleGenerate}
        loading={loading}
        disabled={!name.trim() && !profession.trim()}
        icon={User}
        className="w-full"
      >
        {loading ? "Generating..." : `Generate ${platform.bioType}`}
      </ToolButton>

      {rateLimit && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Rate limit: {rateLimit.remaining} of {rateLimit.limit} requests remaining
        </p>
      )}

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {bios.length > 0 && (
        <ToolResultDivider>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Generated {platform.bioType}s</h3>

          {bios.map((bio, index) => {
            const isOverLimit = bio.length > platform.characterLimit;
            const charsRemaining = platform.characterLimit - bio.length;

            return (
              <div
                key={index}
                className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Option {index + 1}</p>
                  <ToolButton
                    variant="secondary"
                    onClick={() => copyBio(bio, index)}
                    disabled={isOverLimit}
                    icon={copiedIndex === index ? Check : Copy}
                    className="shrink-0"
                  >
                    {copiedIndex === index ? "Copied!" : "Copy"}
                  </ToolButton>
                </div>

                <p className="mb-3 leading-relaxed text-neutral-900 dark:text-white">{bio}</p>

                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-medium ${
                      isOverLimit
                        ? "text-red-600 dark:text-red-400"
                        : charsRemaining < 20
                        ? "text-amber-600 dark:text-amber-500"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {bio.length} / {platform.characterLimit} characters
                  </span>
                  {isOverLimit && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertCircle className="size-3.5" />
                      {Math.abs(charsRemaining)} over limit
                    </span>
                  )}
                  {!isOverLimit && charsRemaining < 20 && (
                    <span className="text-amber-600 dark:text-amber-500">{charsRemaining} remaining</span>
                  )}
                </div>
              </div>
            );
          })}
        </ToolResultDivider>
      )}
    </div>
  );
}
