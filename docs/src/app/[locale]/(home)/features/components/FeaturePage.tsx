import { CTASection } from "@/components/CTASection";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import React from "react";

export interface FeatureCapability {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}

export interface WhoUsesItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface RelatedFeature {
  title: string;
  href: string;
  description: string;
}

export interface FeaturePageProps {
  featureName: string;
  headline: string;
  subtitle: string;
  badgeText: string;
  introParagraphs: React.ReactNode[];
  capabilities: FeatureCapability[];
  howItWorks: HowItWorksStep[];
  whoUses: WhoUsesItem[];
  faqItems: FAQItem[];
  relatedFeatures: RelatedFeature[];
  demoUrl?: string;
  demoCaption?: string;
  ctaTitle?: string;
  ctaDescription?: string;
}

export function FeaturePage({
  featureName,
  headline,
  subtitle,
  badgeText,
  introParagraphs,
  capabilities,
  howItWorks,
  whoUses,
  faqItems,
  relatedFeatures,
  demoUrl,
  demoCaption,
  ctaTitle,
  ctaDescription,
}: FeaturePageProps) {
  const t = useExtracted();

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        eyebrow={badgeText}
        title={headline}
        description={subtitle}
        eventLocation={`feature_${featureName}_hero`}
      />

      {demoUrl && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label={`${featureName} demo`}>
          <div className="mx-auto max-w-[1200px] border-x border-neutral-200 bg-neutral-100 p-2 dark:border-neutral-800 dark:bg-neutral-900 sm:p-3">
            <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950">
              <div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800 sm:px-4">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                </div>
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 font-mono text-xs text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  demo.rybbit.com
                </a>
                <div className="flex items-center justify-self-end gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("Live")}</span>
                </div>
              </div>
              <iframe
                src={demoUrl}
                width="1300"
                height="750"
                className="block h-[440px] w-full md:h-[620px] lg:h-[750px]"
                style={{ border: "none" }}
                title={`${featureName} demo`}
                loading="lazy"
              />
            </div>
            {demoCaption && (
              <p className="px-2 pb-1 pt-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {demoCaption}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{badgeText}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{featureName}</h2>
          </div>
          <div className="space-y-5 px-5 py-12 sm:px-8 lg:col-span-8 lg:px-10 lg:py-16">
            {introParagraphs.map((paragraph, index) => (
              <div
                key={index}
                className="max-w-3xl text-base leading-7 text-neutral-600 dark:text-neutral-300 md:text-lg md:leading-8"
              >
                {paragraph}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="capabilities-title">
        <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Capabilities")}</p>
              <h2 id="capabilities-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("What you can do")}
              </h2>
            </div>
          </div>
          <div className="grid lg:col-span-8 md:grid-cols-2">
            {capabilities.map((capability) => (
              <article
                key={capability.title}
                className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 md:odd:border-r md:[&:nth-last-child(-n+2)]:border-b-0 lg:px-10"
              >
                <div className="mb-5 flex size-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
                  {capability.icon}
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{capability.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {capability.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="how-it-works-title">
        <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Getting Started")}</p>
              <h2 id="how-it-works-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("How it works")}
              </h2>
            </div>
          </div>
          <ol className="lg:col-span-8">
            {howItWorks.map((step) => (
              <li
                key={step.step}
                className="grid border-b border-neutral-200 px-5 py-9 last:border-b-0 dark:border-neutral-800 sm:grid-cols-[64px_1fr] sm:px-8 lg:px-10"
              >
                <span className="mb-4 font-mono text-sm text-emerald-600 dark:text-emerald-400 sm:mb-0">
                  {String(step.step).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="who-uses-title">
        <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
          <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Use Cases")}</p>
            <h2 id="who-uses-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              {t("Who uses this")}
            </h2>
          </div>
          <div className="grid lg:col-span-8 md:grid-cols-3">
            {whoUses.map((item) => (
              <article
                key={item.title}
                className="border-b border-neutral-200 px-5 py-10 last:border-b-0 dark:border-neutral-800 sm:px-8 md:border-b-0 md:border-r md:last:border-r-0 lg:px-8"
              >
                <div className="mb-5 text-neutral-500 dark:text-neutral-400">{item.icon}</div>
                <h3 className="font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {faqItems.length > 0 && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="feature-faq-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("FAQ")}</p>
              <h2 id="feature-faq-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
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

      {relatedFeatures.length > 0 && (
        <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="related-features-title">
          <div className="mx-auto grid max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid-cols-12">
            <div className="border-b border-neutral-200 px-5 py-12 dark:border-neutral-800 sm:px-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:px-10 lg:py-16">
              <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">{t("Explore More")}</p>
              <h2 id="related-features-title" className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                {t("Related features")}
              </h2>
            </div>
            <div className="lg:col-span-8">
              {relatedFeatures.map((feature) => (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group grid border-b border-neutral-200 px-5 py-7 last:border-b-0 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-500 dark:border-neutral-800 dark:hover:bg-neutral-900/60 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-6 sm:px-8 lg:px-10"
                >
                  <span className="font-semibold">{feature.title}</span>
                  <span className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400 sm:mt-0">{feature.description}</span>
                  <ArrowRight className="mt-4 size-4 text-neutral-400 transition-transform group-hover:translate-x-1 sm:mt-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTASection
        title={ctaTitle || t("Ready for better analytics?")}
        description={
          ctaDescription ||
          t("The full analytics surface on one dashboard: cookieless, open source, and live in minutes.")
        }
        eventLocation={`feature_${featureName}_bottom_cta`}
      />
    </div>
  );
}
