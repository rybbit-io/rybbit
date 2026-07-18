"use client";

import { useState } from "react";
import { CopyButton, ToolButton, ToolCallout, ToolField, ToolInput, ToolSelect, ToolTextarea } from "../components/tool-ui";

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

  return (
    <div className="space-y-6">
      <ToolField label="Page Title" htmlFor="og-title" required>
        <ToolInput
          id="og-title"
          type="text"
          value={pageTitle}
          onChange={e => setPageTitle(e.target.value)}
          placeholder="e.g., The Ultimate Guide to Web Analytics"
          disabled={isLoading}
        />
      </ToolField>

      <ToolField label="Page Description" htmlFor="og-description" required>
        <ToolTextarea
          id="og-description"
          value={pageDescription}
          onChange={e => setPageDescription(e.target.value)}
          placeholder="e.g., Learn how to track website visitors, measure conversions, and grow your business with privacy-focused analytics..."
          disabled={isLoading}
          rows={4}
        />
      </ToolField>

      <ToolField label="Page Type" htmlFor="og-type">
        <ToolSelect
          id="og-type"
          value={pageType}
          onChange={e => setPageType(e.target.value as typeof pageType)}
          disabled={isLoading}
        >
          <option value="website">Website</option>
          <option value="article">Article</option>
          <option value="blog">Blog Post</option>
          <option value="product">Product</option>
        </ToolSelect>
      </ToolField>

      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {remainingRequests !== null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{remainingRequests} requests remaining this minute</p>
      )}

      <ToolButton onClick={generateOGTags} loading={isLoading} className="w-full">
        {isLoading ? "Generating OG Tags..." : "Generate Open Graph Tags"}
      </ToolButton>

      {variations.length > 0 && (
        <div className="space-y-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Generated Variations</h3>
          {variations.map((variation, index) => (
            <div
              key={index}
              className="rounded-md border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-white">{variation.variation}</h4>
                <CopyButton value={variation.htmlCode} variant="primary" label="Copy HTML" copiedLabel="Copied!" className="shrink-0" />
              </div>

              <div className="mb-4 space-y-3">
                <div>
                  <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Title</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{variation.ogTitle}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Description</p>
                  <p className="text-sm text-neutral-900 dark:text-white">{variation.ogDescription}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Type</p>
                    <p className="text-sm text-neutral-900 dark:text-white">{variation.ogType}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Twitter Card</p>
                    <p className="text-sm text-neutral-900 dark:text-white">{variation.twitterCard}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Image Suggestion</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">{variation.ogImageSuggestion}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">HTML Code</p>
                <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-neutral-100 p-3 dark:border-neutral-800 dark:bg-neutral-950">
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
