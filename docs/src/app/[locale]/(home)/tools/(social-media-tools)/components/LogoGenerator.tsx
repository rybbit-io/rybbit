"use client";

import { useState } from "react";
import { Palette, Download, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { LogoGeneratorPlatformConfig } from "./logo-generator-platform-configs";

interface LogoGeneratorProps {
  platform: LogoGeneratorPlatformConfig;
}

const DESIGN_STYLES = [
  { id: "minimalist", name: "Minimalist", description: "Clean lines, simple shapes" },
  { id: "modern", name: "Modern", description: "Contemporary and sleek" },
  { id: "playful", name: "Playful", description: "Fun and colorful" },
  { id: "professional", name: "Professional", description: "Corporate and trustworthy" },
  { id: "vintage", name: "Vintage", description: "Retro and classic" },
  { id: "abstract", name: "Abstract", description: "Artistic and unique" },
  { id: "geometric", name: "Geometric", description: "Structured shapes" },
  { id: "hand-drawn", name: "Hand-drawn", description: "Organic and personal" },
];

export function LogoGenerator({ platform }: LogoGeneratorProps) {
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState(platform.recommendedStyles[0]?.toLowerCase() || "modern");
  const [colors, setColors] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimit, setRateLimit] = useState<{
    limit: number;
    remaining: number;
    reset: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!brandName.trim()) {
      setError("Please provide a brand or company name");
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl(null);

    try {
      const response = await fetch("/api/tools/generate-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          industry: industry.trim() || undefined,
          style,
          colors: colors.trim() || undefined,
          platform: platform.id,
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
        throw new Error(data.error || "Failed to generate logo");
      }

      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // If it's a data URL, convert to blob
      if (imageUrl.startsWith("data:")) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${brandName.trim().toLowerCase().replace(/\s+/g, "-")}-logo.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // For external URLs
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `${brandName.trim().toLowerCase().replace(/\s+/g, "-")}-logo.png`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to download logo. Try right-clicking and saving the image.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Context Guidelines */}
      <div className="mb-8 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <div className="flex gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg h-fit">
            <Palette className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
              {platform.name} Logo Guidelines
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{platform.contextGuidelines}</p>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <div className="space-y-6 mb-8">
        {/* Brand Name Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Brand or Company Name *
          </label>
          <input
            type="text"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            placeholder="Enter your brand or company name"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Industry Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Industry or Niche (Optional)
          </label>
          <input
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="e.g., Technology, Food & Beverage, Fashion, Fitness"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Style Selector */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">Design Style</label>
          <select
            value={style}
            onChange={e => setStyle(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white"
          >
            {DESIGN_STYLES.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} - {s.description}
              </option>
            ))}
          </select>
        </div>

        {/* Colors Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-2">
            Color Preferences (Optional)
          </label>
          <input
            type="text"
            value={colors}
            onChange={e => setColors(e.target.value)}
            placeholder="e.g., Blue and white, Earth tones, Vibrant colors"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !brandName.trim()}
          className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Logo...
            </>
          ) : (
            <>
              <Palette className="w-5 h-5" />
              Generate Logo
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

      {/* Generated Logo */}
      {imageUrl && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Your Generated Logo</h3>

          <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            {/* Logo Display */}
            <div className="flex justify-center mb-6">
              <div className="relative bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Generated logo for ${brandName}`}
                  className="max-w-full max-h-[400px] object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleDownload}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              <strong>Tip:</strong> Not quite right? Try adjusting your style or color preferences and regenerate. Each
              generation creates a unique design.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogoGenerator;
