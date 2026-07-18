import { CTASection } from "@/components/CTASection";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, CheckCircle, CircleMinus } from "lucide-react";
import { useExtracted } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import React from "react";

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
        <CheckCircle className="size-5 text-emerald-500" aria-label={t("Included")} />
      ) : (
        <CircleMinus className="size-5 text-neutral-400" aria-label={t("Not included")} />
      );
    }

    return <span className="text-neutral-700 dark:text-neutral-300">{value}</span>;
  };

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow={t("Comparison")}
        title={t("Rybbit vs {competitor}", { competitor: competitorName })}
        description={
          subtitle ||
          t("Compare the key features of Rybbit and {competitor}.", { competitor: competitorName })
        }
        eventLocation={`compare_${competitorName.toLowerCase().replaceAll(" ", "_")}_hero`}
      />

      {introHeading && introParagraphs && introParagraphs.length > 0 && (
        <section className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <h2 className="max-w-sm text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{introHeading}</h2>
            </div>
            <div className="space-y-5 px-5 py-12 sm:px-8 lg:col-span-8 lg:px-10 lg:py-16">
              {introParagraphs.map((paragraph) => (
                <p key={paragraph} className="max-w-3xl text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg md:leading-8">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {chooseRybbit && chooseCompetitor && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="comparison-fit-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Comparison")}</p>
              <h2 id="comparison-fit-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("Which is right for you?")}
              </h2>
            </div>
            <div className="grid lg:col-span-8 md:grid-cols-2">
              <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 md:border-b-0 md:border-r lg:px-10">
                <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {t("Choose Rybbit if...")}
                </h3>
                <ul className="mt-6 space-y-4">
                  {chooseRybbit.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                      <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-5 py-10 sm:px-8 lg:px-10">
                <h3 className="text-lg font-semibold">
                  {t("Choose {competitor} if...", { competitor: competitorName })}
                </h3>
                <ul className="mt-6 space-y-4">
                  {chooseCompetitor.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                      <CheckCircle className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="comparison-table-title">
        <div className="mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:px-10 lg:py-16">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Feature by feature")}</p>
            <h2 id="comparison-table-title" className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {t("Why choose Rybbit over {competitor}?", { competitor: competitorName })}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="w-2/5 px-6 py-5 text-left font-medium text-neutral-500 lg:px-10">{t("Capability")}</th>
                  <th className="border-l border-neutral-200 px-6 py-5 text-center dark:border-neutral-800">
                    <Image
                      src="/rybbit/horizontal_white.svg"
                      alt="Rybbit"
                      width={92}
                      height={25}
                      className="mx-auto invert dark:invert-0"
                    />
                  </th>
                  <th className="border-l border-neutral-200 px-6 py-5 text-center font-semibold dark:border-neutral-800">
                    {competitorName}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <React.Fragment key={section.title}>
                    <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
                      <th colSpan={3} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 lg:px-10">
                        {section.title}
                      </th>
                    </tr>
                    {section.features.map((feature) => (
                      <tr key={`${section.title}-${feature.name}`} className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
                        <th className="px-6 py-4 text-left font-medium text-neutral-700 dark:text-neutral-300 lg:px-10">{feature.name}</th>
                        <td className="border-l border-neutral-200 px-6 py-4 text-center dark:border-neutral-800">
                          <div className="flex justify-center">{renderFeatureValue(feature.rybbitValue)}</div>
                        </td>
                        <td className="border-l border-neutral-200 px-6 py-4 text-center dark:border-neutral-800">
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

      {rybbitPricing && competitorPricing && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="pricing-comparison-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Pricing")}</p>
              <h2 id="pricing-comparison-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("Pricing comparison")}
              </h2>
            </div>
            <div className="grid lg:col-span-8 md:grid-cols-2">
              {[rybbitPricing, competitorPricing].map((pricing, pricingIndex) => (
                <article
                  key={pricing.name}
                  className="border-b border-neutral-200 px-5 py-10 last:border-b-0 dark:border-neutral-800 sm:px-8 md:border-b-0 md:first:border-r lg:px-10"
                >
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{pricing.model}</p>
                  <h3 className="mt-2 text-xl font-semibold">{pricing.name}</h3>
                  <p className={`mt-6 text-3xl font-semibold tracking-tight ${pricingIndex === 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                    {pricing.startingPrice}
                  </p>
                  <ul className="mt-7 space-y-3">
                    {pricing.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
                        <CheckCircle className={`mt-0.5 size-4 shrink-0 ${pricingIndex === 0 ? "text-emerald-500" : "text-neutral-400"}`} aria-hidden="true" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {!hasNewSections && comparisonContent && (
        <section className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-[1200px] border-x border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:px-10 lg:py-16">
            <div className="prose prose-neutral mx-auto max-w-3xl dark:prose-invert">{comparisonContent}</div>
          </div>
        </section>
      )}

      {faqItems && faqItems.length > 0 && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="comparison-faq-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("FAQ")}</p>
              <h2 id="comparison-faq-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("Frequently asked questions")}
              </h2>
            </div>
            <Accordion type="single" collapsible className="lg:col-span-8">
              {faqItems.map((faq, index) => (
                <AccordionItem key={faq.question} value={`item-${index}`} className="last:border-b-0">
                  <AccordionTrigger className="px-5 py-5 text-left sm:px-8 lg:px-10">{faq.question}</AccordionTrigger>
                  <AccordionContent className="px-5 pb-6 sm:px-8 lg:px-10">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {relatedResources && relatedResources.length > 0 && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="related-resources-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Resources")}</p>
              <h2 id="related-resources-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("Related resources")}
              </h2>
            </div>
            <div className="lg:col-span-8">
              {relatedResources.map((resource) => (
                <Link
                  key={resource.href}
                  href={resource.href}
                  className="group grid border-b border-neutral-200 px-5 py-7 last:border-b-0 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
                >
                  <span className="font-semibold">{resource.title}</span>
                  <span className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400 sm:mt-0">{resource.description}</span>
                  <ArrowRight className="mt-4 size-4 text-neutral-400 transition-transform group-hover:translate-x-1 sm:mt-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTASection title="Switch to analytics that's made for you" eventLocation="comparison_bottom_cta" />
    </div>
  );
}
