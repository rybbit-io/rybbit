"use client";

import { CircleCheckBig, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLink } from "@/components/AppLink";
import { BASIC_SITE_LIMIT, BASIC_TEAM_LIMIT, DEFAULT_EVENT_LIMIT, FREE_SITE_LIMIT, STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "@/lib/const";
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

  return <span className={cn("text-sm text-center block text-neutral-900 dark:text-white")}>{value}</span>;
}

export function ComparisonSection({ isAnnual }: { isAnnual: boolean }) {
  const t = useExtracted();

  const COMPARISON_FEATURES = [
    {
      category: t("Usage"),
      features: [
        {
          name: t("Monthly pageviews"),
          free: DEFAULT_EVENT_LIMIT.toLocaleString(),
          basic: t("100K - 250K"),
          standard: t("100K - 20M+"),
          pro: t("100K - 20M+"),
          enterprise: t("Custom"),
        },
        {
          name: t("Number of websites"),
          free: `${FREE_SITE_LIMIT}`,
          basic: `${BASIC_SITE_LIMIT}`,
          standard: t("Up to {count}", { count: String(STANDARD_SITE_LIMIT) }),
          pro: t("Unlimited"),
          enterprise: t("Unlimited"),
        },
        {
          name: t("Team members"),
          free: "1",
          basic: `${BASIC_TEAM_LIMIT}`,
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
          free: true,
          basic: true,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Advanced filtering"),
          free: true,
          basic: true,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Custom events"),
          free: true,
          basic: true,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Bot filtering"),
          free: true,
          basic: true,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Goals"),
          free: false,
          basic: true,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Real-time globe"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Web vitals"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Error tracking"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Pages view"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Sessions"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("User profiles"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Funnels"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Journeys"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Retention"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Email reports"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("API"),
          free: false,
          basic: false,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Session replays"),
          free: false,
          basic: false,
          standard: false,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Single Sign-On (SSO)"),
          free: false,
          basic: false,
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Dedicated isolated instance"),
          free: false,
          basic: false,
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("On-premise installation"),
          free: false,
          basic: false,
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Custom features"),
          free: false,
          basic: false,
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Whitelabeling"),
          free: false,
          basic: false,
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
          free: true,
          basic: true,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("No cookies required"),
          free: true,
          basic: true,
          standard: true,
          pro: true,
          enterprise: true,
        },
        {
          name: t("Data retention"),
          free: t("6 months"),
          basic: t("2 years"),
          standard: t("2 years"),
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
          free: t("Community"),
          basic: t("Email"),
          standard: t("Email"),
          pro: t("Priority"),
          enterprise: t("Enterprise + Slack"),
        },
        {
          name: t("Manual invoicing"),
          free: false,
          basic: false,
          standard: false,
          pro: false,
          enterprise: true,
        },
        {
          name: t("Uptime SLA"),
          free: false,
          basic: false,
          standard: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
  ];

  return (
    <section className="-mt-8 pb-8 w-full relative z-10">
      <div className="max-w-[1200px] mx-auto px-4 overflow-x-auto">
        <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800">
          <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 overflow-hidden min-w-[900px]">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-0 py-6 bg-neutral-100/50 dark:bg-neutral-800/20">
              <div className="flex items-center px-6 border-r border-neutral-400/50 dark:border-neutral-700/50 text-xl font-semibold text-neutral-800 dark:text-neutral-200">
                {t("Compare Plans")}
              </div>
              <div className="flex flex-col items-center justify-center px-4 border-r border-neutral-400/50 dark:border-neutral-700/50">
                <div className="font-semibold text-lg text-center mb-3">
                  {t("Basic")}{" "}
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-normal block">From ${isAnnual ? "9" : "14"} /month</span>
                </div>
                <AppLink
                  href="https://app.rybbit.io/signup"
                  className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {t("Start for $0")}
                </AppLink>
              </div>
              <div className="flex flex-col items-center justify-center px-4 border-r border-neutral-400/50 dark:border-neutral-700/50">
                <div className="font-semibold text-lg text-center mb-3">
                  {t("Standard")}{" "}
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-normal block">From ${isAnnual ? "13" : "19"} /month</span>
                </div>
                <AppLink
                  href="https://app.rybbit.io/signup"
                  className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {t("Start for $0")}
                </AppLink>
              </div>
              <div className="flex flex-col items-center justify-center px-4 border-r border-neutral-400/50 dark:border-neutral-700/50">
                <div className="font-semibold text-lg text-emerald-600 dark:text-emerald-400 text-center mb-3">
                  {t("Pro")}{" "}
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-normal block">From ${isAnnual ? "26" : "39"} /month</span>
                </div>
                <AppLink
                  href="https://app.rybbit.io/signup"
                  className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {t("Start for $0")}
                </AppLink>
              </div>
              <div className="flex flex-col items-center justify-center px-4">
                <div className="font-semibold text-lg text-center mb-3">
                  {t("Enterprise")}{" "}
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-normal block">{t("Custom")}</span>
                </div>
                <a
                  href="https://www.rybbit.com/contact"
                  className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  {t("Contact us")}
                </a>
              </div>
            </div>

            {/* Feature Categories */}
            {COMPARISON_FEATURES.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                {/* Category Header - Skip for "Usage" category */}
                {category.category !== "Usage" && (
                  <div className="grid grid-cols-5 gap-0 py-3 border-b border-neutral-400 dark:border-neutral-700 bg-neutral-100/30 dark:bg-neutral-800/10">
                    <div className="flex items-center px-6 border-r border-neutral-400/50 dark:border-neutral-700/50">
                      <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 text-base">
                        {category.category}
                      </h3>
                    </div>
                    <div className="border-r border-neutral-400/50 dark:border-neutral-700/50"></div>
                    <div className="border-r border-neutral-400/50 dark:border-neutral-700/50"></div>
                    <div className="border-r border-neutral-400/50 dark:border-neutral-700/50"></div>
                    <div></div>
                  </div>
                )}

                {/* Category Features */}
                {category.features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className="grid grid-cols-5 gap-0 py-3 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/20 transition-colors border-b border-neutral-300/30 dark:border-neutral-800/30 last:border-b-0"
                  >
                    <div className="flex items-center px-6 border-r border-neutral-400/50 dark:border-neutral-700/50">
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{feature.name}</span>
                    </div>
                    <div className="flex items-center justify-center px-4 border-r border-neutral-400/50 dark:border-neutral-700/50">
                      <FeatureCell value={feature.basic} />
                    </div>
                    <div className="flex items-center justify-center px-4 border-r border-neutral-400/50 dark:border-neutral-700/50">
                      <FeatureCell value={feature.standard} />
                    </div>
                    <div className="flex items-center justify-center px-4 border-r border-neutral-400/50 dark:border-neutral-700/50">
                      <FeatureCell value={feature.pro} />
                    </div>
                    <div className="flex items-center justify-center px-4">
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
