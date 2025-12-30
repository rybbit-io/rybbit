import { ReactNode } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RelatedTools } from "@/components/RelatedTools";
import { ToolCTA } from "./ToolCTA";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface FAQItem {
  question: string;
  answer: ReactNode;
}

export interface ToolPageLayoutProps {
  // Required sections
  toolSlug: string;
  title: string;
  description: string;
  badge?: string; // e.g., "AI-Powered Tool", "Free Tool"
  toolComponent: ReactNode;
  educationalContent: ReactNode;
  faqs: FAQItem[];
  relatedToolsCategory: "seo" | "analytics" | "privacy" | "social-media";

  // CTA section
  ctaTitle: string;
  ctaDescription: string;
  ctaEventLocation: string;
  ctaButtonText?: string;

  // Optional metadata for structured data (passed through)
  structuredData?: object;
}

export function ToolPageLayout({
  toolSlug,
  title,
  description,
  badge = "Free Tool",
  toolComponent,
  educationalContent,
  faqs,
  relatedToolsCategory,
  ctaTitle,
  ctaDescription,
  ctaEventLocation,
  ctaButtonText,
  structuredData,
}: ToolPageLayoutProps) {
  return (
    <>
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      )}

      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Tools", href: "/tools" }, { label: title }]} />

          {/* 1. Header */}
          <div className="mb-16">
            <div className="inline-block mb-4 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{badge}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mb-6 tracking-tight">
              {title}
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">{description}</p>
          </div>

          {/* 2. The Actual Tool */}
          <div className="mb-16">{toolComponent}</div>

          {/* 3. Educational Content */}
          <div className="mb-16 prose prose-neutral dark:prose-invert max-w-none">{educationalContent}</div>

          {/* 4. FAQ Section */}
          {faqs.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Frequently Asked Questions</h2>
              <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className={index === faqs.length - 1 ? "border-b-0" : ""}
                    >
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          )}

          {/* 5. Related Tools */}
          <RelatedTools currentToolHref={`/tools/${toolSlug}`} category={relatedToolsCategory} />
        </div>

        {/* 6. CTA */}
        <ToolCTA
          title={ctaTitle}
          description={ctaDescription}
          eventLocation={ctaEventLocation}
          buttonText={ctaButtonText}
        />
      </div>
    </>
  );
}
