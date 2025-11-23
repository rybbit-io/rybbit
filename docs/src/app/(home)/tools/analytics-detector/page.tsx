"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { AlertCircle, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Platform {
  name: string;
  category: string;
  privacy: string;
  identifier?: string;
}

interface DetectionResult {
  platforms: Platform[];
  summary: string;
  privacyScore: string;
}

export default function AnalyticsDetectorPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  const detectAnalytics = async () => {
    if (!url) {
      setError("Please enter a website URL");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/tools/detect-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) setRemainingRequests(parseInt(remaining));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to detect analytics");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getPrivacyScoreColor = (score: string) => {
    switch (score.toLowerCase()) {
      case "low":
        return "text-emerald-600 dark:text-emerald-400";
      case "medium":
        return "text-orange-600 dark:text-orange-400";
      case "high":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-neutral-600 dark:text-neutral-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">AI-Powered Tool</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
            Analytics Platform Detector
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Discover what analytics and tracking tools any website is using. Analyze privacy implications and understand data collection practices.
          </p>
          {remainingRequests !== null && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4">
              {remainingRequests} requests remaining this minute
            </p>
          )}
        </div>

        {/* Tool */}
        <div className="mb-16">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Website URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isLoading}
                onKeyDown={e => e.key === "Enter" && detectAnalytics()}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Enter the full URL including https://
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
              </div>
            )}

            <button
              onClick={detectAnalytics}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Website...
                </>
              ) : (
                "Detect Analytics"
              )}
            </button>

            {result && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
                {/* Summary */}
                <div className="p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Privacy Score</h3>
                      <p className={`text-2xl font-bold ${getPrivacyScoreColor(result.privacyScore)}`}>
                        {result.privacyScore}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-900 dark:text-blue-200">{result.summary}</p>
                </div>

                {/* Detected Platforms */}
                {result.platforms.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                      Detected Platforms ({result.platforms.length})
                    </h3>
                    <div className="space-y-3">
                      {result.platforms.map((platform, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-neutral-900 dark:text-white">{platform.name}</h4>
                            <span className="px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full">
                              {platform.category}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">{platform.privacy}</p>
                          {platform.identifier && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                              ID: {platform.identifier}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <p className="text-neutral-600 dark:text-neutral-400">
                      No analytics platforms detected on this website.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Understanding Analytics Detection</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How does this tool work?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  This tool fetches the website's HTML, analyzes the scripts and tags, and uses AI to identify analytics platforms, tag managers, and tracking technologies. It looks for common patterns, script URLs, and tracking identifiers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What do the privacy scores mean?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Privacy scores indicate tracking intensity: Low (minimal tracking, privacy-focused tools), Medium (moderate tracking, some cookies), High (extensive tracking, multiple third-party services). This helps you understand data collection practices.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Why choose privacy-focused analytics?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Privacy-focused analytics like{" "}
                  <Link href="https://rybbit.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit
                  </Link>{" "}
                  don't use cookies, don't track users across sites, and are GDPR compliant by default. You get the insights you need while respecting user privacy—no cookie banners required.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Privacy-first analytics with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            No cookies, no cross-site tracking, full GDPR compliance. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "analytics_detector_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
