"use client";

import { Download, Palette, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  ToolButton,
  ToolCallout,
  ToolField,
  ToolInput,
  ToolSelect,
} from "../../components/tool-ui";
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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Context Guidelines */}
      <ToolCallout variant="info" icon={Palette} title={`${platform.name} Logo Guidelines`}>
        {platform.contextGuidelines}
      </ToolCallout>

      {/* Generator Form */}
      <div className="space-y-6">
        <ToolField label="Brand or Company Name" htmlFor="logo-brand-name" required>
          <ToolInput
            id="logo-brand-name"
            type="text"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            placeholder="Enter your brand or company name"
          />
        </ToolField>

        <ToolField label="Industry or Niche (Optional)" htmlFor="logo-industry">
          <ToolInput
            id="logo-industry"
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="e.g., Technology, Food & Beverage, Fashion, Fitness"
          />
        </ToolField>

        <ToolField label="Design Style" htmlFor="logo-style">
          <ToolSelect id="logo-style" value={style} onChange={e => setStyle(e.target.value)}>
            {DESIGN_STYLES.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} - {s.description}
              </option>
            ))}
          </ToolSelect>
        </ToolField>

        <ToolField label="Color Preferences (Optional)" htmlFor="logo-colors">
          <ToolInput
            id="logo-colors"
            type="text"
            value={colors}
            onChange={e => setColors(e.target.value)}
            placeholder="e.g., Blue and white, Earth tones, Vibrant colors"
          />
        </ToolField>

        <ToolButton
          onClick={handleGenerate}
          loading={loading}
          disabled={!brandName.trim()}
          icon={Palette}
          className="w-full"
        >
          {loading ? "Generating Logo..." : "Generate Logo"}
        </ToolButton>
      </div>

      {/* Rate Limit Info */}
      {rateLimit && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Rate limit: {rateLimit.remaining} of {rateLimit.limit} requests remaining
        </p>
      )}

      {/* Error Message */}
      {error && <ToolCallout variant="error">{error}</ToolCallout>}

      {/* Generated Logo */}
      {imageUrl && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Your Generated Logo</h3>

          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900/50">
            {/* Logo Display */}
            <div className="mb-6 flex justify-center">
              <div className="relative rounded-md bg-neutral-100 p-4 dark:bg-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Generated logo for ${brandName}`}
                  className="max-h-[400px] max-w-full rounded-md object-contain"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <ToolButton onClick={handleDownload} icon={Download}>
                Download PNG
              </ToolButton>
              <ToolButton
                variant="secondary"
                onClick={handleGenerate}
                disabled={loading}
                icon={RefreshCw}
              >
                Regenerate
              </ToolButton>
            </div>
          </div>

          {/* Tips */}
          <ToolCallout variant="tip" title="Tip">
            Not quite right? Try adjusting your style or color preferences and regenerate. Each
            generation creates a unique design.
          </ToolCallout>
        </div>
      )}
    </div>
  );
}

export default LogoGenerator;
