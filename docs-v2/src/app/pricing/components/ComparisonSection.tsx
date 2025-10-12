"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPARISON_FEATURES = [
  {
    category: "Usage",
    features: [
      {
        name: "Monthly events",
        free: "10,000",
        standard: "100K - 10M+",
        pro: "100K - 10M+",
      },
      {
        name: "Number of websites",
        free: "Up to 3",
        standard: "Up to 10",
        pro: "Unlimited",
      },
      {
        name: "Team members",
        free: false,
        standard: "Up to 3",
        pro: "Unlimited",
      },
    ],
  },
  {
    category: "Features",
    features: [
      {
        name: "Core analytics dashboard",
        free: true,
        standard: true,
        pro: true,
      },
      {
        name: "Advanced filtering",
        free: true,
        standard: true,
        pro: true,
      },
      {
        name: "Custom events",
        free: true,
        standard: true,
        pro: true,
      },
      {
        name: "Bot filtering",
        free: true,
        standard: true,
        pro: true,
      },
      {
        name: "Real-time globe",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Web vitals",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Error tracking",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Pages view",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Sessions",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "User profiles",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Funnels",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Goals",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Journeys",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Retention",
        free: false,
        standard: true,
        pro: true,
      },
      {
        name: "Session replays",
        free: false,
        standard: false,
        pro: true,
      },
    ],
  },
  {
    category: "Data & Privacy",
    features: [
      {
        name: "Privacy-friendly",
        free: true,
        standard: true,
        pro: true,
      },
      {
        name: "GDPR compliant",
        free: true,
        standard: true,
        pro: true,
      },
      {
        name: "No cookies required",
        free: true,
        standard: true,
        pro: true,
      },
      {
        name: "Data retention",
        free: "6 months",
        standard: "2 years",
        pro: "5+ years",
      },
    ],
  },
  {
    category: "Support & Integrations",
    features: [
      {
        name: "Email support",
        free: "Community",
        standard: "Standard",
        pro: "Priority",
      },
    ],
  },
];

interface FeatureCellProps {
  value: boolean | string;
}

function FeatureCell({ value }: FeatureCellProps) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-emerald-400 mx-auto" />
    ) : (
      <X className="h-5 w-5 text-neutral-500 mx-auto" />
    );
  }

  return <span className={cn("text-sm text-center block text-white")}>{value}</span>;
}

export function ComparisonSection() {
  return (
    <section className="-mt-8 pb-8 w-full">
      <div className="max-w-6xl mx-auto px-4">
        <div className="w-full border border-neutral-800/50 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-0 py-6 bg-neutral-800/20">
            <div className="flex items-center px-6 border-r border-neutral-700/50 text-xl font-semibold text-neutral-200">
              Compare Plans
            </div>
            <div className="flex flex-col items-center justify-center px-6 border-r border-neutral-700/50">
              <div className="font-semibold text-lg text-center mb-3">
                Free <span className="text-sm text-neutral-400 font-normal block">$0/month</span>
              </div>
              <a
                href="https://app.rybbit.io/signup"
                className="inline-flex items-center justify-center px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg border border-neutral-600 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Start Free
              </a>
            </div>
            <div className="flex flex-col items-center justify-center px-6 border-r border-neutral-700/50">
              <div className="font-semibold text-lg text-center mb-3">
                Standard <span className="text-sm text-neutral-400 font-normal block">From $19/month</span>
              </div>
              <a
                href="https://app.rybbit.io/signup"
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Try Free
              </a>
            </div>
            <div className="flex flex-col items-center justify-center px-6">
              <div className="font-semibold text-lg text-emerald-400 text-center mb-3">
                Pro <span className="text-sm text-neutral-400 font-normal block">From $39/month</span>
              </div>
              <a
                href="https://app.rybbit.io/signup"
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Try Free
              </a>
            </div>
          </div>

          {/* Feature Categories */}
          {COMPARISON_FEATURES.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {/* Category Header - Skip for "Usage" category */}
              {category.category !== "Usage" && (
                <div className="grid grid-cols-4 gap-0 py-3 border-b border-neutral-700 bg-neutral-800/10">
                  <div className="flex items-center px-6 border-r border-neutral-700/50">
                    <h3 className="font-semibold text-neutral-100 text-base">{category.category}</h3>
                  </div>
                  <div className="border-r border-neutral-700/50"></div>
                  <div className="border-r border-neutral-700/50"></div>
                  <div></div>
                </div>
              )}

              {/* Category Features */}
              {category.features.map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className="grid grid-cols-4 gap-0 py-3 hover:bg-neutral-800/20 transition-colors border-b border-neutral-800/30 last:border-b-0"
                >
                  <div className="flex items-center px-6 border-r border-neutral-700/50">
                    <span className="text-sm text-neutral-300">{feature.name}</span>
                  </div>
                  <div className="flex items-center justify-center px-6 border-r border-neutral-700/50">
                    <FeatureCell value={feature.free} />
                  </div>
                  <div className="flex items-center justify-center px-6 border-r border-neutral-700/50">
                    <FeatureCell value={feature.standard} />
                  </div>
                  <div className="flex items-center justify-center px-6">
                    <FeatureCell value={feature.pro} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
