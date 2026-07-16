"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

interface DescriptionOption {
  description: string;
  length: number;
  approach: string;
}

export function MetaDescriptionForm() {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [descriptions, setDescriptions] = useState<DescriptionOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  const generateDescriptions = async () => {
    if (!topic) {
      setError("Please enter a topic");
      return;
    }

    setIsLoading(true);
    setError("");
    setDescriptions([]);

    try {
      const response = await fetch("/api/tools/generate-meta-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords: keywords || undefined }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) setRemainingRequests(parseInt(remaining));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate descriptions");
      }

      const data = await response.json();
      setDescriptions(data.descriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyDescription = async (description: string, index: number) => {
    await navigator.clipboard.writeText(description);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getLengthColor = (length: number) => {
    if (length >= 150 && length <= 160) return "text-emerald-600 dark:text-emerald-400";
    if (length > 160 && length <= 170) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <>
      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          {remainingRequests} requests remaining this minute
        </p>
      )}

      <div className="mb-16">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Page Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Complete Guide to Content Marketing Strategy"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Target Keywords (Optional)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g., content marketing, SEO, digital strategy"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Comma-separated keywords to include</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
              <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
            </div>
          )}

          <button
            onClick={generateDescriptions}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Descriptions...
              </>
            ) : (
              "Generate Meta Descriptions"
            )}
          </button>

          {descriptions.length > 0 && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Generated Descriptions</h3>
              {descriptions.map((option, index) => (
                <div
                  key={index}
                  className="p-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="flex-1 text-neutral-900 dark:text-white">{option.description}</p>
                    <button
                      onClick={() => copyDescription(option.description, index)}
                      className="flex-shrink-0 px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                    >
                      {copiedIndex === index ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={`font-medium ${getLengthColor(option.length)}`}>{option.length} characters</span>

                    <span className="text-neutral-600 dark:text-neutral-400">{option.approach}</span>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Tip:</strong> Optimal meta description length is 150-160 characters. Longer descriptions may
                  be truncated in search results.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-20 -mx-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Optimize your content with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            Track which pages perform best and refine your meta descriptions based on real visitor data. Get started for
            free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} pageviews per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "meta_description_generator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </>
  );
}
