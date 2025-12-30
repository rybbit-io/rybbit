"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Copy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function UTMBuilderForm() {
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
              Website URL <span className="text-red-500">*</span>
            </label>
            <input
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
              Campaign Source <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="google, newsletter, facebook"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">The referrer (e.g., google, newsletter)</p>
          </div>

          {/* Campaign Medium */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Campaign Medium <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={medium}
              onChange={e => setMedium(e.target.value)}
              placeholder="cpc, email, social"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Marketing medium (e.g., cpc, email, social)</p>
          </div>

          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
              placeholder="summer_sale, product_launch"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Product, promo code, or slogan (e.g., summer_sale)</p>
          </div>

          {/* Campaign Term (Optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Campaign Term</label>
            <input
              type="text"
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="running_shoes, blue_widget"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Identify the paid keywords (optional)</p>
          </div>

          {/* Campaign Content (Optional) */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Campaign Content</label>
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="logolink, textlink"
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Differentiate ads or links (optional)</p>
          </div>

          {/* Result */}
          {utmUrl && (
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">Your UTM URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={utmUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg text-neutral-900 dark:text-white font-mono text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
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
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Frequently Asked Questions</h2>
        <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is UTM tracking?</AccordionTrigger>
              <AccordionContent>
                UTM (Urchin Tracking Module) parameters are tags added to URLs that help you track the effectiveness of your marketing campaigns in analytics tools like Rybbit, Google Analytics, and others. They tell you exactly where your traffic is coming from and how your campaigns perform.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>What are the required UTM parameters?</AccordionTrigger>
              <AccordionContent>
                The three required parameters are: <strong>utm_source</strong> (identifies the source like google or newsletter), <strong>utm_medium</strong> (identifies the medium like cpc or email), and <strong>utm_campaign</strong> (identifies the specific campaign like summer_sale).
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>How do I track UTM links with Rybbit?</AccordionTrigger>
              <AccordionContent>
                Once you have Rybbit installed on your website, UTM parameters are automatically tracked. You can view your campaign performance in your{" "}
                <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Rybbit dashboard
                </Link>{" "}
                under the UTM section.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>What are optional UTM parameters?</AccordionTrigger>
              <AccordionContent>
                <strong>utm_term</strong> is used for tracking paid search keywords, while <strong>utm_content</strong> helps differentiate between different ads or links within the same campaign. These are optional but useful for deeper campaign analysis and A/B testing.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-b-0">
              <AccordionTrigger>What naming conventions should I follow?</AccordionTrigger>
              <AccordionContent>
                Use lowercase letters and underscores instead of spaces (e.g., summer_sale, not Summer Sale). Be consistent across campaigns so data is properly grouped in analytics. Avoid special characters and keep names descriptive but concise.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </>
  );
}
