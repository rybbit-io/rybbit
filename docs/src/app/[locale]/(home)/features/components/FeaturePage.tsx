import { BackgroundGrid } from "@/components/BackgroundGrid";
import { CTASection } from "@/components/CTASection";
import { SectionBadge } from "@/components/SectionBadge";
import { TrackedButton } from "@/components/TrackedButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import { Tilt_Warp } from "next/font/google";
import Link from "next/link";
import React from "react";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

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
    <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
      <BackgroundGrid />

      {/* Hero */}
      <div className="relative flex flex-col py-8">
        <div className="flex justify-center mb-6">
          <SectionBadge>{badgeText}</SectionBadge>
        </div>
        <h1
          className={cn(
            "relative z-10 text-4xl md:text-5xl lg:text-7xl font-medium px-4 tracking-tight max-w-4xl text-center text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-100 dark:to-gray-400",
            tilt_wrap.className
          )}
        >
          {headline}
        </h1>
        <h2 className="relative z-10 text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-3xl text-center text-neutral-600 dark:text-neutral-300 font-light mx-auto">
          {subtitle}
        </h2>

        <div className="relative z-10 flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg px-4">
            <TrackedButton
              href="https://app.rybbit.io/signup"
              eventName="signup"
              eventProps={{
                location: `feature_${featureName}_hero`,
                button_text: "Start for $0",
              }}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Start for $0")}
            </TrackedButton>
            <TrackedButton
              href="https://demo.rybbit.com/81"
              eventName="demo"
              target="_blank"
              rel="noopener noreferrer"
              eventProps={{
                location: `feature_${featureName}_hero`,
                button_text: "Live demo",
              }}
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

      {/* Demo Embed */}
      {demoUrl && (
        <section className="w-full max-w-[1300px] mx-auto px-4 z-10 pb-8">
          <div className="relative">
            {/* Background gradients */}
            <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-emerald-500/30 dark:bg-emerald-500/40 rounded-full blur-[80px] opacity-80 dark:opacity-70"></div>
            <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-600/20 dark:bg-emerald-600/30 rounded-full blur-[70px] opacity-60 dark:opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/30 dark:bg-blue-500/40 rounded-full blur-[80px] opacity-70 dark:opacity-60"></div>
            <div className="absolute bottom-40 right-20 w-[350px] h-[350px] bg-indigo-500/20 dark:bg-indigo-500/30 rounded-full blur-[75px] opacity-60 dark:opacity-50"></div>
            <div className="absolute top-1/4 right-0 w-[320px] h-[320px] bg-purple-500/30 dark:bg-purple-500/40 rounded-full blur-[70px] opacity-60 dark:opacity-50"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-400/20 dark:bg-indigo-400/30 rounded-full blur-[80px] opacity-60 dark:opacity-50"></div>

            {/* Iframe container */}
            <div className="relative z-10 rounded-2xl overflow-hidden bg-neutral-400/10 dark:bg-neutral-100/5 border-8 shadow-2xl shadow-neutral-900/20 dark:shadow-emerald-900/10">
              <iframe
                src={demoUrl}
                width="1300"
                height="750"
                className="w-full h-[400px] md:h-[600px] lg:h-[750px] rounded-xl"
                style={{ border: "none" }}
                title={`${featureName} demo`}
                loading="lazy"
              />
            </div>
          </div>
          {demoCaption && (
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4">
              {demoCaption}
            </p>
          )}
        </section>
      )}

      {/* Intro Paragraphs */}
      <section className="w-full max-w-5xl mx-auto px-4 z-10 py-12">
        <div className="space-y-6">
          {introParagraphs.map((paragraph, index) => (
            <div
              key={index}
              className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-light text-base md:text-lg"
            >
              {paragraph}
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-12 md:py-16 w-full max-w-5xl mx-auto px-4 z-10">
        <div className="mb-10">
          <SectionBadge className="mb-4">
            {t("Capabilities")}
          </SectionBadge>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mt-4">
            {t("What you can do")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((capability, index) => (
            <div
              key={index}
              className="bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-800/50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="text-emerald-600 dark:text-emerald-400">
                  {capability.icon}
                </div>
                <h3 className="font-semibold">{capability.title}</h3>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {capability.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 w-full max-w-5xl mx-auto px-4 z-10">
        <div className="mb-10">
          <SectionBadge className="mb-4">
            {t("Getting Started")}
          </SectionBadge>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mt-4">
            {t("How it works")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {howItWorks.map((step) => (
            <div
              key={step.step}
              className="relative bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800"
            >
              <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 p-6 h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-600/10 dark:bg-emerald-600/15 border border-emerald-600/20 flex items-center justify-center">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                </div>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who Uses */}
      <section className="py-12 md:py-16 w-full max-w-5xl mx-auto px-4 z-10">
        <div className="mb-10">
          <SectionBadge className="mb-4">
            {t("Use Cases")}
          </SectionBadge>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mt-4">
            {t("Who uses this")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whoUses.map((item, index) => (
            <div
              key={index}
              className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800"
            >
              <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 p-6 h-full">
                <div className="text-emerald-600 dark:text-emerald-400 mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      {faqItems.length > 0 && (
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
                  className={
                    index === faqItems.length - 1 ? "border-b-0" : ""
                  }
                >
                  <AccordionTrigger className="md:text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* Related Features */}
      {relatedFeatures.length > 0 && (
        <section className="py-12 w-full max-w-5xl mx-auto px-4 z-10">
          <div className="mb-8">
            <SectionBadge>{t("Explore More")}</SectionBadge>
            <h2 className="text-2xl md:text-3xl font-semibold mt-4">
              {t("Related features")}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedFeatures.map((feature, index) => (
              <Link
                key={index}
                href={feature.href}
                className="group bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-800/50 rounded-lg p-5 transition-all hover:border-emerald-500/30 dark:hover:border-emerald-500/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {feature.title}
                  </span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-1 transition-transform text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-500">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CTASection
        title={ctaTitle || t("Ready for better analytics?")}
        description={
          ctaDescription ||
          t(
            "Powerful insights without the complexity. Privacy-focused analytics that just works."
          )
        }
        eventLocation={`feature_${featureName}_bottom_cta`}
      />
    </div>
  );
}
