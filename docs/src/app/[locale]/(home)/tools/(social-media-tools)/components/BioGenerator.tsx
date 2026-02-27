"use client";

import { useState } from "react";
import { User, Copy, Check, AlertCircle, Loader2 } from "lucide-react";
import type { BioGeneratorPlatformConfig } from "./bio-generator-platform-configs";

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
    <div className="w-full max-w-4xl mx-auto">
      {/* Context Guidelines */}
      <div className="mb-8 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <div className="flex gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg h-fit">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
              {platform.name} {platform.bioType} Guidelines
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{platform.contextGuidelines}</p>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <div className="space-y-6 mb-8">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Name or Brand *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name or brand name"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Profession Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Profession or Role
          </label>
          <input
            type="text"
            value={profession}
            onChange={e => setProfession(e.target.value)}
            placeholder="e.g., Software Engineer, Content Creator, Artist"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Interests Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Interests or Focus Areas (Optional)
          </label>
          <input
            type="text"
            value={interests}
            onChange={e => setInterests(e.target.value)}
            placeholder="e.g., AI, fitness, travel, photography"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Tone Selector */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">Tone</label>
          <select
            value={tone}
            onChange={e => setTone(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white"
          >
            {platform.tones.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || (!name.trim() && !profession.trim())}
          className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <User className="w-5 h-5" />
              Generate {platform.bioType}
            </>
          )}
        </button>
      </div>

      {/* Rate Limit Info */}
      {rateLimit && (
        <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Rate limit: {rateLimit.remaining} of {rateLimit.limit} requests remaining
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Generated Bios */}
      {bios.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Generated {platform.bioType}s</h3>

          {bios.map((bio, index) => {
            const isOverLimit = bio.length > platform.characterLimit;
            const charsRemaining = platform.characterLimit - bio.length;

            return (
              <div
                key={index}
                className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Option {index + 1}</p>
                  <button
                    onClick={() => copyBio(bio, index)}
                    disabled={isOverLimit}
                    className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-md transition-colors duration-200 flex items-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {copiedIndex === index ? (
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
                </div>

                <p className="text-neutral-900 dark:text-white mb-3 leading-relaxed">{bio}</p>

                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-medium ${
                      isOverLimit
                        ? "text-red-600 dark:text-red-400"
                        : charsRemaining < 20
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {bio.length} / {platform.characterLimit} characters
                  </span>
                  {isOverLimit && (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {Math.abs(charsRemaining)} over limit
                    </span>
                  )}
                  {!isOverLimit && charsRemaining < 20 && (
                    <span className="text-orange-600 dark:text-orange-400">{charsRemaining} remaining</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
