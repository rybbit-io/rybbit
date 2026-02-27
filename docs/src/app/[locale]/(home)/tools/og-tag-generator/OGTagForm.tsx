"use client";

import { CheckCircle, Copy, Loader2 } from "lucide-react";
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

export function OGTagForm() {
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

      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {remainingRequests} requests remaining this minute
        </p>
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
  );
}
