"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface OGVariation {
  variation: string;
  ogTitle: string;
  ogDescription: string;
  ogType: string;
  ogImageSuggestion: string;
  twitterCard: string;
  htmlCode: string;
}

export default function OGTagGeneratorPage() {
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [pageType, setPageType] = useState<"website" | "article" | "product" | "blog">("website");
  const [variations, setVariations] = useState<OGVariation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  const generateOGTags = async () => {
    if (!pageTitle || !pageDescription) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError("");
    setVariations([]);

    try {
      const response = await fetch("/api/tools/generate-og-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageTitle, pageDescription, pageType }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) setRemainingRequests(parseInt(remaining));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate OG tags");
      }

      const data = await response.json();
      setVariations(data.variations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
            Open Graph Tag Generator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Generate optimized Open Graph tags for social media sharing. Get perfect previews on Facebook, Twitter, and LinkedIn.
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
                Page Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pageTitle}
                onChange={e => setPageTitle(e.target.value)}
                placeholder="e.g., The Ultimate Guide to Web Analytics"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Page Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={pageDescription}
                onChange={e => setPageDescription(e.target.value)}
                placeholder="e.g., Learn how to track website visitors, measure conversions, and grow your business with privacy-focused analytics..."
                disabled={isLoading}
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Page Type
              </label>
              <select
                value={pageType}
                onChange={e => setPageType(e.target.value as typeof pageType)}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="website">Website</option>
                <option value="article">Article</option>
                <option value="blog">Blog Post</option>
                <option value="product">Product</option>
              </select>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
              </div>
            )}

            <button
              onClick={generateOGTags}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating OG Tags...
                </>
              ) : (
                "Generate Open Graph Tags"
              )}
            </button>

            {variations.length > 0 && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Generated Variations</h3>
                {variations.map((variation, index) => (
                  <div
                    key={index}
                    className="p-6 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-neutral-900 dark:text-white">{variation.variation}</h4>
                      <button
                        onClick={() => copyCode(variation.htmlCode, index)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        {copiedIndex === index ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy HTML
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Title</p>
                        <p className="text-sm text-neutral-900 dark:text-white font-medium">{variation.ogTitle}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Description</p>
                        <p className="text-sm text-neutral-900 dark:text-white">{variation.ogDescription}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Type</p>
                          <p className="text-sm text-neutral-900 dark:text-white">{variation.ogType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Twitter Card</p>
                          <p className="text-sm text-neutral-900 dark:text-white">{variation.twitterCard}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Image Suggestion</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">{variation.ogImageSuggestion}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">HTML Code</p>
                      <pre className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg overflow-x-auto">
                        <code className="text-xs text-neutral-900 dark:text-neutral-100">{variation.htmlCode}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Open Graph Tag FAQs</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What are Open Graph tags?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Open Graph tags are meta tags that control how URLs are displayed when shared on social media platforms like Facebook, LinkedIn, and Twitter. They define the title, description, image, and type of content that appears in social shares.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Why are OG tags important?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  OG tags significantly impact social media engagement. A well-optimized OG image and description can increase click-through rates by 2-3x compared to default previews. They're essential for content marketing and social sharing.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How do I test my OG tags?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Use Facebook's Sharing Debugger, LinkedIn's Post Inspector, or Twitter's Card Validator to test how your OG tags appear. Track social referral traffic with{" "}
                  <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Rybbit Analytics
                  </Link>{" "}
                  to see which OG tags drive the most clicks.
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
            Track your social media traffic with Rybbit
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl mx-auto">
            See which social platforms drive the most traffic and optimize your OG tags based on real data. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "og_tag_generator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
