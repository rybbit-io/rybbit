"use client";

import { CircleCheckBig, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLink } from "@/components/AppLink";
import { GridCrosses } from "@/components/GridCrosses";
import { SectionKicker } from "@/components/deco/SectionKicker";
import { STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "@/lib/const";
import { useExtracted } from "next-intl";

interface FeatureCellProps {
  value: boolean | string;
}
function FeatureCell({ value }: FeatureCellProps) {
  if (typeof value === "boolean") {
    return value ? (
      <CircleCheckBig className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
    ) : (
      <Minus className="h-5 w-5 text-neutral-500 mx-auto" />
    );
  }

  return <span className={cn("block text-center text-sm text-neutral-900 dark:text-white")}>{value}</span>;
}

export function ComparisonSection({ isAnnual }: { isAnnual: boolean }) {
  const t = useExtracted();

  const COMPARISON_FEATURES = [
    {
      category: t("Usage"),
      features: [
        {
          name: t("Monthly pageviews"),
          standard: t("100K - 20M+"),
          pro: t("100K - 20M+"),
          enterprise: t("Custom"),
        },
        {
          name: t("Number of websites"),
          standard: t("Up to {count}", { count: String(STANDARD_SITE_LIMIT) }),
          pro: t("Unlimited"),
          enterprise: t("Unlimited"),
        },
        {
          name: t("Team members"),
          standard: t("Up to {count}", { count: String(STANDARD_TEAM_LIMIT) }),
          pro: t("Unlimited"),
          enterprise: t("Unlimited"),
        },
      ],
    },
    {
      category: t("Features"),
      features: [
        {
          name: t("Core analytics dashboard"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Advanced filtering"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Custom events"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Bot filtering"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Goals"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Real-time globe"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Web vitals"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Error tracking"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Pages view"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Sessions"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("User profiles"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Funnels"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Journeys"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Retention"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Email reports"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("API"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Session replays"),
          standard: false,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Single Sign-On (SSO)"),
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Dedicated isolated instance"),
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("On-premise installation"),
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Custom features"),
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Whitelabeling"),
          standard: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
    {
      category: t("Data & Privacy"),
      features: [
        {
          name: t("Privacy-friendly"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("No cookies required"),
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Data retention"),
          standard: t("3 years"),
          pro: t("5 years"),
          enterprise: t("Infinite"),
        },
      ],
    },
    {
      category: t("Support & Integrations"),
      features: [
        {
          name: t("Support"),
          standard: t("Email"),
          pro: t("Priority"),
          enterprise: t("Enterprise + Slack"),
        },
        {
          name: t("Manual invoicing"),
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Uptime SLA"),
          standard: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
  ];

  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="plan-comparison-title">
      <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
        <GridCrosses />
        <div className="relative border-b border-neutral-200 bg-plate-accent px-5 py-14 dark:border-neutral-800 sm:px-8 md:py-20 lg:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
          />
          <div className="relative">
            <SectionKicker>{t("Plan details")}</SectionKicker>
            <h2
              id="plan-comparison-title"
              className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl text-balance"
            >
              {t("Compare Plans")}
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-end border-r border-neutral-200 px-6 py-7 text-sm font-medium text-neutral-500 dark:border-neutral-800 lg:px-10">
                {t("Included in each plan")}
              </div>
              {[
                {
                  name: t("Standard"),
                  price: "From $" + (isAnnual ? "13" : "19") + " /month",
                  href: "https://app.rybbit.io/signup",
                  cta: t("Start for $0"),
                },
                {
                  name: t("Pro"),
                  price: "From $" + (isAnnual ? "26" : "39") + " /month",
                  href: "https://app.rybbit.io/signup",
                  cta: t("Start for $0"),
                  featured: true,
                },
                {
                  name: t("Enterprise"),
                  price: t("Custom"),
                  href: "https://www.rybbit.com/contact",
                  cta: t("Contact us"),
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className="flex flex-col items-center border-r border-neutral-200 px-4 py-7 text-center last:border-r-0 dark:border-neutral-800"
                >
                  <h3 className={cn("text-lg font-semibold", plan.featured && "text-emerald-600 dark:text-emerald-400")}>
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{plan.price}</p>
                  <AppLink
                    href={plan.href}
                    className={cn(
                      "mt-5 inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
                      plan.featured
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "border border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900"
                    )}
                  >
                    {plan.cta}
                  </AppLink>
                </div>
              ))}
            </div>

            {COMPARISON_FEATURES.map((category) => (
              <div key={category.category}>
                <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 lg:px-10">
                  {category.category}
                </div>
                {category.features.map((feature) => (
                  <div
                    key={feature.name}
                    className="grid grid-cols-4 border-b border-neutral-200 text-sm last:border-b-0 dark:border-neutral-800"
                  >
                    <div className="flex items-center border-r border-neutral-200 px-6 py-4 font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-300 lg:px-10">
                      {feature.name}
                    </div>
                    <div className="flex items-center justify-center border-r border-neutral-200 px-4 py-4 dark:border-neutral-800">
                      <FeatureCell value={feature.standard} />
                    </div>
                    <div className="flex items-center justify-center border-r border-neutral-200 px-4 py-4 dark:border-neutral-800">
                      <FeatureCell value={feature.pro} />
                    </div>
                    <div className="flex items-center justify-center px-4 py-4">
                      <FeatureCell value={feature.enterprise} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
