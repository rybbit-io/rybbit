"use client";

import { CheckCircle, Copy } from "lucide-react";
import { useExtracted } from "next-intl";
import { useMemo, useState } from "react";

export function UTMBuilderForm() {
  const t = useExtracted();
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const utmUrl = useMemo(() => {
    if (!url || !source || !medium || !campaign) return "";

    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      urlObj.searchParams.set("utm_source", source);
      urlObj.searchParams.set("utm_medium", medium);
      urlObj.searchParams.set("utm_campaign", campaign);
      if (term) urlObj.searchParams.set("utm_term", term);
      if (content) urlObj.searchParams.set("utm_content", content);
      return urlObj.toString();
    } catch {
      return "";
    }
  }, [url, source, medium, campaign, term, content]);

  const copyToClipboard = async () => {
    if (utmUrl) {
      await navigator.clipboard.writeText(utmUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearForm = () => {
    setUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
    setCopied(false);
  };

  return (
    <>
      {/* Tool Section */}
      <div className="mb-16">
        <div className="space-y-6">
          {/* Website URL */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Website URL ")}
              <span className="text-red-500">*</span>
            </label>
            <input
              required
              aria-label={t("Website URL")}
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Campaign Source */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Campaign Source ")}
              <span className="text-red-500">*</span>
            </label>
            <input
              required
              aria-label={t("Campaign Source")}
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder={t("google, newsletter, facebook")}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t("The referrer (e.g., google, newsletter)")}
            </p>
          </div>

          {/* Campaign Medium */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Campaign Medium ")}
              <span className="text-red-500">*</span>
            </label>
            <input
              required
              aria-label={t("Campaign Medium")}
              type="text"
              value={medium}
              onChange={e => setMedium(e.target.value)}
              placeholder={t("cpc, email, social")}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t("Marketing medium (e.g., cpc, email, social)")}
            </p>
          </div>

          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Campaign Name ")}
              <span className="text-red-500">*</span>
            </label>
            <input
              required
              aria-label={t("Campaign Name")}
              type="text"
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
              placeholder={t("summer_sale, product_launch")}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t("Product, promo code, or slogan (e.g., summer_sale)")}
            </p>
          </div>

          {/* Campaign Term (Optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Campaign Term")}
            </label>
            <input
              type="text"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder={t("running_shoes, blue_widget")}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t("Identify the paid keywords (optional)")}
            </p>
          </div>

          {/* Campaign Content (Optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              {t("Campaign Content")}
            </label>
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t("logolink, textlink")}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t("Differentiate ads or links (optional)")}
            </p>
          </div>

          {/* Result */}
          {utmUrl && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                {t("Your UTM URL")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={utmUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-950 dark:text-emerald-100 font-mono text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? t("Copied") : t("Copy")}
                </button>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={clearForm}
              className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              {t("Clear")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
