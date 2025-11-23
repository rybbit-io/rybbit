"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DEFAULT_EVENT_LIMIT } from "@/lib/const";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

export default function AIPrivacyPolicyGeneratorPage() {
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [generatedPolicy, setGeneratedPolicy] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);

  const generatePolicy = async () => {
    if (!websiteName || !websiteUrl || !contactEmail || !siteDescription) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");
    setGeneratedPolicy("");

    try {
      const response = await fetch("/api/tools/generate-privacy-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteName,
          websiteUrl,
          contactEmail,
          siteDescription,
        }),
      });

      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining) setRemainingRequests(parseInt(remaining));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate policy");
      }

      const data = await response.json();
      setGeneratedPolicy(data.policy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedPolicy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPolicy = () => {
    const blob = new Blob([generatedPolicy], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privacy-policy.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            AI Privacy Policy Generator
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Generate a comprehensive, GDPR-compliant privacy policy tailored to your website using AI. Just describe your site and we'll handle the rest.
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
                Website Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={websiteName}
                onChange={e => setWebsiteName(e.target.value)}
                placeholder="Acme Inc."
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Website URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="privacy@example.com"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Describe Your Website <span className="text-red-500">*</span>
              </label>
              <textarea
                value={siteDescription}
                onChange={e => setSiteDescription(e.target.value)}
                placeholder="We run an e-commerce store selling handmade jewelry. We collect email addresses for newsletters, process payments through Stripe, and use cookies for shopping cart functionality..."
                disabled={isLoading}
                rows={6}
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Describe what your site does, what data you collect, how you use it, and any third-party services
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
              </div>
            )}

            <button
              onClick={generatePolicy}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Policy...
                </>
              ) : (
                "Generate Privacy Policy"
              )}
            </button>

            {generatedPolicy && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white">
                    Your Generated Privacy Policy
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={downloadPolicy}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Download
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto p-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg">
                  <pre className="text-xs text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap font-mono">
                    {generatedPolicy}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-6 mb-16">
          <p className="text-sm text-yellow-900 dark:text-yellow-200">
            <strong>Disclaimer:</strong> This AI-generated privacy policy is a starting point. While it's tailored to your description, you should have it reviewed by a legal professional to ensure compliance with all applicable laws and regulations in your jurisdiction.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">About AI-Generated Policies</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  How is this different from the template generator?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  This AI-powered tool understands your specific business description and generates a customized policy that addresses your unique use case. It's more comprehensive and tailored than a simple template, and includes a section about Rybbit's privacy-focused analytics.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Is this legally binding?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  The generated policy is a comprehensive starting point based on common legal requirements (GDPR, CCPA). However, you should always have a lawyer review any legal document before publishing it. Laws vary by jurisdiction and your specific circumstances.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Why does it mention Rybbit?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  If you use analytics on your site, you need to disclose it in your privacy policy. The generated policy includes a section about Rybbit's privacy-focused, cookieless analytics as an example of responsible data collection that respects user privacy.
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
            No cookies, no tracking, full GDPR compliance. Get powerful analytics without compromising your users' privacy. Get started for free with up to {DEFAULT_EVENT_LIMIT.toLocaleString()} events per month.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "ai_privacy_policy_generator_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
