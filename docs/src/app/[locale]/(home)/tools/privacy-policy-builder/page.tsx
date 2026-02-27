import { Metadata } from "next";
import Link from "next/link";
import { PrivacyPolicyBuilderForm } from "./PrivacyPolicyBuilderForm";
import { ToolPageLayout } from "../components/ToolPageLayout";

export const metadata: Metadata = {
  title: "Free Privacy Policy Builder | Create Custom Privacy Policy for Your Website",
  description:
    "Generate a customized, GDPR and CCPA compliant privacy policy in minutes. Free privacy policy builder tool with compliance checklist, legal requirements, and best practices.",
  openGraph: {
    title: "Free Privacy Policy Builder | Create Custom Privacy Policy",
    description:
      "Generate a customized privacy policy for your website in minutes. GDPR and CCPA compliant. Free tool with no sign-up required.",
    type: "website",
    url: "https://rybbit.com/tools/privacy-policy-builder",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Privacy Policy Builder",
    description: "Create a custom privacy policy for your website instantly. GDPR and CCPA compliant.",
  },
  alternates: {
    canonical: "https://rybbit.com/tools/privacy-policy-builder",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Privacy Policy Builder",
      applicationCategory: "Legal Tool",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "GDPR compliance",
        "CCPA compliance",
        "Customizable templates",
        "Data collection options",
        "Cookie policy generation",
        "Data sharing sections",
        "Download as Markdown",
      ],
      operatingSystem: "Any",
      url: "https://rybbit.com/tools/privacy-policy-builder",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do I need a privacy policy for my website?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, if you collect any personal information from visitors (including analytics data), you're legally required to have a privacy policy in most jurisdictions. This includes the EU (GDPR), California (CCPA), and many other regions. Even if you don't collect personal data, having a privacy policy builds trust with your users.",
          },
        },
        {
          "@type": "Question",
          name: "What should a privacy policy include?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A comprehensive privacy policy should include: what information you collect, how you collect it, how you use it, who you share it with, how you protect it, user rights (access, deletion, etc.), cookie usage, contact information, and how you notify users of changes.",
          },
        },
        {
          "@type": "Question",
          name: "Is analytics data considered personal data under GDPR?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Under GDPR and similar regulations, IP addresses and analytics data can be considered personal data. However, privacy-focused analytics tools like Rybbit don't use cookies and anonymize data, making compliance much easier. If you use Rybbit, you typically won't need a cookie consent banner.",
          },
        },
        {
          "@type": "Question",
          name: "How often should I update my privacy policy?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You should update your privacy policy whenever your data practices change, such as adding new analytics tools, integrating third-party services, or modifying how you collect or use data. Regular reviews (at least annually) help ensure ongoing compliance with changing regulations.",
          },
        },
        {
          "@type": "Question",
          name: "Can I use this generated policy without consulting a lawyer?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "While this tool provides a comprehensive starting point, privacy laws vary by jurisdiction and business type. For websites handling sensitive data, operating in regulated industries, or dealing with international users, consulting a legal professional is recommended to ensure full compliance with applicable laws.",
          },
        },
      ],
    },
  ],
};

const educationalContent = (
  <>
    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
      Why Your Website Needs a Privacy Policy
    </h2>
    <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
      A privacy policy is more than just a legal requirement—it's a critical document that establishes trust with your
      visitors and demonstrates your commitment to protecting their data. Whether you collect customer information, use
      analytics tools, or deploy cookies on your site, a clear and transparent privacy policy is essential.
    </p>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">
      Legal Requirements by Jurisdiction
    </h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>GDPR (European Union):</strong> Any website accessible to EU residents must have a compliant privacy
        policy. Violations can result in fines up to 4% of annual revenue.
      </li>
      <li>
        <strong>CCPA (California):</strong> Websites collecting personal information from California residents must
        disclose data practices and provide consumer rights information.
      </li>
      <li>
        <strong>COPPA (United States):</strong> If your site targets children under 13, you must comply with additional
        privacy protections.
      </li>
      <li>
        <strong>Other Regions:</strong> Australia, Canada, Japan, and other countries have their own privacy laws with
        specific disclosure requirements.
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">Key Customization Tips</h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Be Specific:</strong> Use your actual company name, website URL, and contact email. Generic policies
        lack credibility.
      </li>
      <li>
        <strong>Disclose All Data Practices:</strong> Check all boxes that apply to your website, including analytics,
        cookies, and data sharing.
      </li>
      <li>
        <strong>Update Regularly:</strong> Review and update your policy whenever you add new tools, services, or change
        how you collect data.
      </li>
      <li>
        <strong>Make it Accessible:</strong> Link prominently to your privacy policy in your website footer and ensure
        it's easy to find.
      </li>
      <li>
        <strong>Use Clear Language:</strong> Avoid legal jargon where possible. Users should understand how you use
        their data.
      </li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">
      Privacy Policy Compliance Checklist
    </h3>
    <ul className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>Clearly state what personal information you collect</li>
      <li>Explain how you collect it (forms, cookies, analytics, etc.)</li>
      <li>Describe how you use the collected information</li>
      <li>List all third parties with whom you share data</li>
      <li>Explain your data security measures</li>
      <li>Include user rights (access, deletion, portability)</li>
      <li>Provide clear contact information for privacy inquiries</li>
      <li>Explain how users can opt-out of data collection</li>
      <li>Include a change notification procedure</li>
      <li>Address children's privacy (if applicable)</li>
    </ul>

    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3 mt-8">
      How to Use This Privacy Policy Builder
    </h3>
    <ol className="space-y-2 text-neutral-700 dark:text-neutral-300 mb-6">
      <li>
        <strong>Enter Your Details:</strong> Provide your company name, website URL, and contact email.
      </li>
      <li>
        <strong>Select Your Practices:</strong> Check the boxes that match your website's data collection practices.
      </li>
      <li>
        <strong>Generate Your Policy:</strong> The tool will create a comprehensive privacy policy tailored to your
        selections.
      </li>
      <li>
        <strong>Review and Customize:</strong> Download the policy and review it carefully. Add jurisdiction-specific
        clauses if needed.
      </li>
      <li>
        <strong>Publish and Link:</strong> Add the policy to your website footer and ensure easy access from all pages.
      </li>
      <li>
        <strong>Keep Updated:</strong> Review quarterly or whenever your data practices change.
      </li>
    </ol>

    <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-6 my-6">
      <p className="text-sm text-yellow-900 dark:text-yellow-200">
        <strong>Disclaimer:</strong> This privacy policy is provided as a starting point and should not be considered
        legal advice. Privacy laws vary by jurisdiction (GDPR, CCPA, etc.) and your specific business needs. Please
        consult with a legal professional to ensure compliance with applicable laws and regulations in your
        jurisdiction.
      </p>
    </div>
  </>
);

const faqs = [
  {
    question: "Do I need a privacy policy for my website?",
    answer: (
      <>
        Yes, if you collect any personal information from visitors (including analytics data), you're legally required
        to have a privacy policy in most jurisdictions. This includes the EU (GDPR), California (CCPA), and many other
        regions. Even if you don't collect personal data, having a privacy policy builds trust with your users and
        demonstrates your commitment to privacy.
      </>
    ),
  },
  {
    question: "What should a comprehensive privacy policy include?",
    answer: (
      <>
        A comprehensive privacy policy should include: what information you collect, how you collect it, how you use it,
        who you share it with, how you protect it, user rights (access, deletion, etc.), cookie usage, contact
        information, children's privacy practices (if applicable), and how you notify users of changes. This tool covers
        all essential sections to help ensure compliance.
      </>
    ),
  },
  {
    question: "Is analytics data considered personal data under GDPR?",
    answer: (
      <>
        Under GDPR and similar regulations, IP addresses and analytics data can be considered personal data. However,
        privacy-focused analytics tools like{" "}
        <Link href="https://app.rybbit.io" className="text-emerald-600 dark:text-emerald-400 hover:underline">
          Rybbit
        </Link>{" "}
        don't use cookies and anonymize data, making compliance much easier. If you use privacy-first analytics, you
        typically won't need a cookie consent banner.
      </>
    ),
  },
  {
    question: "How often should I update my privacy policy?",
    answer: (
      <>
        You should update your privacy policy whenever your data practices change, such as adding new analytics tools,
        integrating third-party services, or modifying how you collect or use data. At minimum, conduct a thorough
        review quarterly. Always inform users of significant changes.
      </>
    ),
  },
  {
    question: "Can I use this generated policy without consulting a lawyer?",
    answer: (
      <>
        This tool provides a comprehensive starting point for most websites. However, if you handle sensitive data
        (health, financial info), operate in regulated industries, serve international users, or have specific legal
        concerns, consulting a legal professional is recommended to ensure full compliance with applicable laws in your
        jurisdiction.
      </>
    ),
  },
];

export default function PrivacyPolicyBuilderPage() {
  return (
    <ToolPageLayout
      toolSlug="privacy-policy-builder"
      title="Privacy Policy Builder"
      description="Generate a customized, compliant privacy policy for your website in minutes. Answer a few questions and download your policy instantly."
      badge="Free Tool"
      toolComponent={<PrivacyPolicyBuilderForm />}
      educationalContent={educationalContent}
      faqs={faqs}
      relatedToolsCategory="privacy"
      ctaTitle="Stay compliant with privacy-first analytics"
      ctaDescription="Rybbit doesn't use cookies and anonymizes all data, making GDPR and CCPA compliance simple. No cookie banners needed."
      ctaEventLocation="privacy_policy_builder_cta"
      structuredData={structuredData}
    />
  );
}
