import { BackgroundGrid } from "@/components/BackgroundGrid";
import { CTASection } from "@/components/CTASection";
import { SectionBadge } from "@/components/SectionBadge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle, CircleMinus } from "lucide-react";
import { useExtracted } from "next-intl";
import { Tilt_Warp } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { TrackedButton } from "@/components/TrackedButton";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export interface ComparisonFeature {
  name: string;
  rybbitValue: string | boolean;
  competitorValue: string | boolean;
}

export interface ComparisonSection {
  title: string;
  features: ComparisonFeature[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PricingInfo {
  name: string;
  model: string;
  startingPrice: string;
  highlights: string[];
}

export interface RelatedResource {
  title: string;
  href: string;
  description: string;
}

export interface ComparisonPageProps {
  competitorName: string;
  sections: ComparisonSection[];
  comparisonContent?: React.ReactNode;
  subtitle?: string;
  introHeading?: string;
  introParagraphs?: string[];
  chooseRybbit?: string[];
  chooseCompetitor?: string[];
  rybbitPricing?: PricingInfo;
  competitorPricing?: PricingInfo;
  faqItems?: FAQItem[];
  relatedResources?: RelatedResource[];
}

export function ComparisonPage({
  competitorName,
  sections,
  comparisonContent,
  subtitle,
  introHeading,
  introParagraphs,
  chooseRybbit,
  chooseCompetitor,
  rybbitPricing,
  competitorPricing,
  faqItems,
  relatedResources,
}: ComparisonPageProps) {
  const t = useExtracted();

  const hasNewSections = !!chooseRybbit;

  const renderFeatureValue = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircle className="w-5 h-5 text-emerald-500" />
      ) : (
        <CircleMinus className="w-5 h-5 text-neutral-500" />
      );
    }
    return <span className="text-neutral-700 dark:text-neutral-300">{value}</span>;
  };

  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
      <BackgroundGrid />
      <div className="relative flex flex-col py-8">
        {/* Grid background with fade */}

        <h1
          className={cn(
            "relative z-10 text-4xl md:text-5xl lg:text-7xl font-medium  px-4 tracking-tight max-w-4xl text-center text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-100 dark:to-gray-400",
            tilt_wrap.className
          )}
        >
          {t("Rybbit vs {competitor}", { competitor: competitorName })}
        </h1>
        <h2 className="relative z-10 text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-4xl text-center text-neutral-600 dark:text-neutral-300 font-light">
          {subtitle
            ? subtitle
            : t("Compare the key features of Rybbit and {competitor}.", { competitor: competitorName })}
        </h2>

        <div className="relative z-10 flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg px-4">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{ location: "hero", button_text: "Track your site" }}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Track your site")}
            </TrackedButton>
            <TrackedButton
              href="https://demo.rybbit.com/1"
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{ location: "hero", button_text: "Live demo" }}
              className="w-full sm:w-auto bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium px-5 py-3 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Live demo")}
            </TrackedButton>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm flex items-center justify-center gap-2 mt-6">
            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
            {t("7-day free trial. Cancel anytime.")}
          </p>
        </div>
      </div>

      {/* Intro paragraphs */}
      {introHeading && introParagraphs && introParagraphs.length > 0 && (
        <section className="w-full max-w-5xl mx-auto px-4 z-10 pb-4">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6">
            {introHeading}
          </h2>
          <div className="space-y-4">
            {introParagraphs.map((paragraph, index) => (
              <p key={index} className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-light">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Which is right for you? */}
      {chooseRybbit && chooseCompetitor && (
        <section className="py-12 w-full max-w-5xl mx-auto px-4 z-10">
          <div className="mb-8">
            <SectionBadge>{t("Comparison")}</SectionBadge>
            <h2 className="text-2xl md:text-3xl font-semibold mt-4">
              {t("Which is right for you?")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Choose Rybbit */}
            <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-emerald-500/30 dark:border-emerald-500/20">
              <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 p-6 h-full">
                <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                  {t("Choose Rybbit if...")}
                </h3>
                <ul className="space-y-3">
                  {chooseRybbit.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Choose Competitor */}
            <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800">
              <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 p-6 h-full">
                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
                  {t("Choose {competitor} if...", { competitor: competitorName })}
                </h3>
                <ul className="space-y-3">
                  {chooseCompetitor.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="w-full max-w-5xl mx-auto mt-12 px-4 z-10">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4 md:mb-6 text-left">
          {t("Why choose Rybbit over {competitor}?", { competitor: competitorName })}
        </h2>
      </div>
      {/* Comparison Table */}
      <section className="pb-12 pt-4 w-full max-w-5xl mx-auto px-4">
        <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800">
          <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 overflow-hidden text-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-300 dark:border-neutral-800">
                  <th className="text-left p-6 w-2/5"></th>
                  <th className="text-center p-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-semibold">
                        <Image
                          src="/rybbit/horizontal_white.svg"
                          alt="Rybbit"
                          width={100}
                          height={27}
                          className="dark:invert-0 invert"
                        />
                      </span>
                    </div>
                  </th>
                  <th className="text-center p-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-semibold">{competitorName}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, sectionIndex) => (
                  <React.Fragment key={sectionIndex}>
                    <tr>
                      <td colSpan={3} className="px-6 py-4 bg-neutral-200/70 dark:bg-neutral-800/50">
                        <span className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">
                          {section.title}
                        </span>
                      </td>
                    </tr>
                    {section.features.map((feature, featureIndex) => (
                      <tr
                        key={`${sectionIndex}-${featureIndex}`}
                        className={
                          featureIndex < section.features.length - 1
                            ? "border-b border-neutral-300 dark:border-neutral-800"
                            : ""
                        }
                      >
                        <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300 text-sm">{feature.name}</td>
                        <td className="px-6 py-4 text-center text-sm">
                          <div className="flex justify-center">{renderFeatureValue(feature.rybbitValue)}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          <div className="flex justify-center">{renderFeatureValue(feature.competitorValue)}</div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      {rybbitPricing && competitorPricing && (
        <section className="py-12 w-full max-w-5xl mx-auto px-4 z-10">
          <div className="mb-8">
            <SectionBadge>{t("Pricing")}</SectionBadge>
            <h2 className="text-2xl md:text-3xl font-semibold mt-4">
              {t("Pricing comparison")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rybbit Pricing */}
            <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-emerald-500/30 dark:border-emerald-500/20">
              <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{rybbitPricing.name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{rybbitPricing.model}</p>
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-6">{rybbitPricing.startingPrice}</p>
                <ul className="space-y-3">
                  {rybbitPricing.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 text-sm">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Competitor Pricing */}
            <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800">
              <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{competitorPricing.name}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{competitorPricing.model}</p>
                </div>
                <p className="text-3xl font-bold text-neutral-700 dark:text-neutral-300 mb-6">{competitorPricing.startingPrice}</p>
                <ul className="space-y-3">
                  {competitorPricing.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 text-sm">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Old comparison content - only if new sections not provided */}
      {!hasNewSections && comparisonContent && (
        <section className="py-12 md:py-16 w-full max-w-3xl mx-auto px-4">
          <div className="prose prose-invert prose-neutral max-w-none">{comparisonContent}</div>
        </section>
      )}

      {/* FAQ Section */}
      {faqItems && faqItems.length > 0 && (
        <section className="py-12 w-full max-w-5xl mx-auto px-4 z-10">
          <div className="mb-8">
            <SectionBadge>{t("FAQ")}</SectionBadge>
            <h2 className="text-2xl md:text-3xl font-semibold mt-4">
              {t("Frequently asked questions")}
            </h2>
          </div>
          <div className="bg-neutral-100/50 dark:bg-neutral-800/20 backdrop-blur-sm border border-neutral-300/50 dark:border-neutral-800/50 rounded-xl overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className={index === faqItems.length - 1 ? "border-b-0" : ""}
                >
                  <AccordionTrigger className="md:text-lg">{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* Related Resources */}
      {relatedResources && relatedResources.length > 0 && (
        <section className="py-12 w-full max-w-5xl mx-auto px-4 z-10">
          <div className="mb-8">
            <SectionBadge>{t("Resources")}</SectionBadge>
            <h2 className="text-2xl md:text-3xl font-semibold mt-4">
              {t("Related resources")}
            </h2>
          </div>
          <ul className="space-y-3">
            {relatedResources.map((resource, index) => (
              <li key={index}>
                <Link
                  href={resource.href}
                  className="group flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span className="font-medium">{resource.title}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-500">&mdash; {resource.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CTASection
        title="Switch to analytics that's made for you"
        eventLocation="comparison_bottom_cta"
      />
    </div>
  );
}
