"use client";

import { TrackedButton } from "@/components/TrackedButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Copy } from "lucide-react";
import { useState } from "react";

export default function PrivacyPolicyBuilderPage() {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [collectsPersonalData, setCollectsPersonalData] = useState(false);
  const [usesCookies, setUsesCookies] = useState(false);
  const [usesAnalytics, setUsesAnalytics] = useState(false);
  const [sharesData, setSharesData] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePolicy = () => {
    if (!companyName || !websiteUrl || !contactEmail) return "";

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    return `# Privacy Policy

**Last updated: ${today}**

This Privacy Policy describes how ${companyName} ("we", "us", or "our") collects, uses, and shares information when you visit ${websiteUrl} (the "Site").

## Information We Collect

${
  collectsPersonalData
    ? `### Personal Information

When you visit our Site, we may collect certain personal information that you voluntarily provide to us, such as:

- Name and contact information (email address, phone number)
- Account credentials
- Payment information
- Any other information you choose to provide`
    : "We do not collect personal information from visitors to our Site unless voluntarily provided."
}

${
  usesCookies
    ? `### Cookies and Tracking Technologies

We use cookies and similar tracking technologies to track activity on our Site and hold certain information. Cookies are files with a small amount of data that are stored on your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.`
    : "We do not use cookies or similar tracking technologies on our Site."
}

${
  usesAnalytics
    ? `### Analytics

We use analytics services to help us understand how visitors use our Site. These services may collect information such as:

- Pages visited
- Time spent on pages
- Links clicked
- Browser type and version
- Device information
- IP address (anonymized)`
    : ""
}

## How We Use Your Information

We use the information we collect to:

- Provide, maintain, and improve our Site
- Respond to your inquiries and requests
${collectsPersonalData ? "- Send you updates and marketing communications (with your consent)" : ""}
- Monitor and analyze usage patterns
- Detect, prevent, and address technical issues

## Information Sharing

${
  sharesData
    ? `We may share your information with:

- Service providers who assist us in operating our Site
- Business partners with your consent
- Law enforcement or regulatory authorities when required by law
- In connection with a merger, sale, or acquisition of our business

We do not sell your personal information to third parties.`
    : "We do not share your personal information with third parties, except as required by law."
}

## Data Security

We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction.

## Your Rights

Depending on your location, you may have certain rights regarding your personal information, including:

- The right to access your personal information
- The right to correct inaccurate information
- The right to delete your information
- The right to object to or restrict processing
- The right to data portability

To exercise these rights, please contact us at ${contactEmail}.

## Children's Privacy

Our Site is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at:

**Email:** ${contactEmail}
**Website:** ${websiteUrl}

---

*This privacy policy was generated using ${websiteUrl.includes("rybbit") ? "Rybbit's" : "[Rybbit's](https://rybbit.com)"} Privacy Policy Builder. For compliance with specific regulations (GDPR, CCPA, etc.), please consult with a legal professional.*`;
  };

  const policy = generatePolicy();

  const copyToClipboard = async () => {
    if (policy) {
      await navigator.clipboard.writeText(policy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadPolicy = () => {
    if (!policy) return;

    const blob = new Blob([policy], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privacy-policy.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearForm = () => {
    setCompanyName("");
    setWebsiteUrl("");
    setContactEmail("");
    setCollectsPersonalData(false);
    setUsesCookies(false);
    setUsesAnalytics(false);
    setSharesData(false);
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-16">
          <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Free Tool</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
            Privacy Policy Builder
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Generate a customized privacy policy for your website. Answer a few questions and get a compliant privacy policy instantly.
          </p>
        </div>

        {/* Tool */}
        <div className="mb-16">
          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Website URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Contact Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="privacy@example.com"
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">What does your website do?</p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectsPersonalData}
                  onChange={e => setCollectsPersonalData(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-neutral-300 dark:border-neutral-700 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">Collects personal data</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Name, email, phone number, payment info, etc.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usesCookies}
                  onChange={e => setUsesCookies(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-neutral-300 dark:border-neutral-700 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">Uses cookies</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Session cookies, tracking cookies, etc.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usesAnalytics}
                  onChange={e => setUsesAnalytics(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-neutral-300 dark:border-neutral-700 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">Uses analytics</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Google Analytics, Rybbit, Plausible, etc.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sharesData}
                  onChange={e => setSharesData(e.target.checked)}
                  className="mt-1 w-4 h-4 text-emerald-600 border-neutral-300 dark:border-neutral-700 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">Shares data with third parties</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    Service providers, partners, advertisers, etc.
                  </div>
                </div>
              </label>
            </div>

            {/* Preview */}
            {policy && (
              <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white">
                    Your Privacy Policy (Markdown)
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
                    {policy}
                  </pre>
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

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-6 mb-12">
          <p className="text-sm text-yellow-900 dark:text-yellow-200">
            <strong>Disclaimer:</strong> This privacy policy is provided as a starting point and should not be considered legal advice. Privacy laws vary by jurisdiction (GDPR, CCPA, etc.) and your specific business needs. Please consult with a legal professional to ensure compliance with applicable laws and regulations.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Privacy Policy FAQs</h2>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Do I need a privacy policy?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Yes, if you collect any personal information from visitors (including analytics data), you're legally required to have a privacy policy in most jurisdictions. This includes the EU (GDPR), California (CCPA), and many other regions. Even if you don't collect personal data, having a privacy policy builds trust with your users.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-b border-neutral-300/50 dark:border-neutral-800/50">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  What should a privacy policy include?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  A comprehensive privacy policy should include: what information you collect, how you collect it, how you use it, who you share it with, how you protect it, user rights (access, deletion, etc.), cookie usage, contact information, and how you notify users of changes.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="px-6 py-4 text-base font-medium hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                  Is analytics considered personal data?
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-neutral-700 dark:text-neutral-300">
                  Under GDPR and similar regulations, IP addresses and analytics data can be considered personal data. However, privacy-focused analytics tools like Rybbit don't use cookies and anonymize data, making compliance much easier. If you use Rybbit, you typically won't need a cookie consent banner.
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
            No cookies, no tracking, full GDPR compliance. Get powerful analytics without compromising your users' privacy.
          </p>
          <TrackedButton
            href="https://app.rybbit.io/signup"
            eventName="signup"
            eventProps={{ location: "privacy_policy_builder_cta" }}
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-10 py-4 text-lg rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Start tracking for free
          </TrackedButton>
        </div>
      </div>
    </div>
  );
}
