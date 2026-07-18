"use client";

import { useState } from "react";
import { CopyButton, ToolButton, ToolField, ToolInput } from "../components/tool-ui";

export function PrivacyPolicyBuilderForm() {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [collectsPersonalData, setCollectsPersonalData] = useState(false);
  const [usesCookies, setUsesCookies] = useState(false);
  const [usesAnalytics, setUsesAnalytics] = useState(false);
  const [sharesData, setSharesData] = useState(false);

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
  };

  return (
    <div className="space-y-6">
      <ToolField label="Company Name" htmlFor="privacy-company" required>
        <ToolInput
          id="privacy-company"
          type="text"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="Acme Inc."
        />
      </ToolField>

      <ToolField label="Website URL" htmlFor="privacy-url" required>
        <ToolInput
          id="privacy-url"
          type="text"
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
        />
      </ToolField>

      <ToolField label="Contact Email" htmlFor="privacy-email" required>
        <ToolInput
          id="privacy-email"
          type="email"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
          placeholder="privacy@example.com"
        />
      </ToolField>

      {/* Checkboxes */}
      <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <p className="mb-3 text-sm font-medium text-neutral-900 dark:text-white">What does your website do?</p>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={collectsPersonalData}
            onChange={e => setCollectsPersonalData(e.target.checked)}
            className="mt-1 size-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700"
          />
          <div>
            <div className="text-sm font-medium text-neutral-900 dark:text-white">Collects personal data</div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              Name, email, phone number, payment info, etc.
            </div>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={usesCookies}
            onChange={e => setUsesCookies(e.target.checked)}
            className="mt-1 size-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700"
          />
          <div>
            <div className="text-sm font-medium text-neutral-900 dark:text-white">Uses cookies</div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Session cookies, tracking cookies, etc.</div>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={usesAnalytics}
            onChange={e => setUsesAnalytics(e.target.checked)}
            className="mt-1 size-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700"
          />
          <div>
            <div className="text-sm font-medium text-neutral-900 dark:text-white">Uses analytics</div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400">Google Analytics, Rybbit, Plausible, etc.</div>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={sharesData}
            onChange={e => setSharesData(e.target.checked)}
            className="mt-1 size-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 dark:border-neutral-700"
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
        <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">Your Privacy Policy (Markdown)</span>
            <div className="flex gap-2">
              <CopyButton value={policy} copiedLabel="Copied!" />
              <ToolButton onClick={downloadPolicy}>Download</ToolButton>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-900 dark:text-neutral-100">{policy}</pre>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-4 pt-4">
        <ToolButton variant="secondary" onClick={clearForm}>
          Clear
        </ToolButton>
      </div>
    </div>
  );
}
