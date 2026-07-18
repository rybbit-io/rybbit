import { TrackedButton } from "@/components/TrackedButton";
import { ArrowRight, Check } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";

export function LandingPricing() {
  const t = useExtracted();

  const plans = [
    {
      name: t("Standard"),
      description: t("Complete web and product analytics for growing teams."),
      price: "$19",
      cadence: t("per month"),
      features: [t("100k monthly events"), t("10 websites"), t("5 team members")],
      href: "https://app.rybbit.io/signup",
      eventLocation: "pricing_standard",
      cta: t("Start free"),
    },
    {
      name: t("Pro"),
      description: t("Session replay and higher limits for teams that need more depth."),
      price: "$39",
      cadence: t("per month"),
      features: [t("Everything in Standard"), t("Session replay"), t("Unlimited websites")],
      href: "https://app.rybbit.io/signup",
      eventLocation: "pricing_pro",
      cta: t("Start free"),
    },
    {
      name: t("Self-hosted"),
      description: t("Run the complete open-source stack on your own infrastructure."),
      price: "$0",
      cadence: t("software license"),
      features: [t("AGPL v3"), t("Full data ownership"), t("Community support")],
      href: "/docs/self-hosting",
      eventLocation: "pricing_self_hosted",
      cta: t("Self-host Rybbit"),
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-16 border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 md:py-28 lg:px-10 lg:py-32">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <h2 className="max-w-[760px] text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              {t("Start small. Keep every capability.")}
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="max-w-[52ch] text-pretty text-base leading-7 text-neutral-600 dark:text-neutral-400">
              {t("Cloud plans scale with monthly events. Every plan starts with a 7-day trial, and the open-source edition stays free.")}
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {t("See full pricing details")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-14 overflow-hidden rounded-lg border border-neutral-200 lg:mt-20 dark:border-neutral-800">
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              className={`grid grid-cols-1 gap-7 px-5 py-7 sm:px-7 lg:grid-cols-12 lg:items-center lg:gap-5 ${
                index > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""
              } ${index === 1 ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
            >
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                  {index === 1 && (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t("Recommended")}</span>
                  )}
                </div>
              </div>
              <div className="lg:col-span-2">
                <span className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">{plan.price}</span>
                <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">{plan.cadence}</span>
              </div>
              <p className="max-w-[46ch] text-sm leading-6 text-neutral-600 lg:col-span-3 dark:text-neutral-400">
                {plan.description}
              </p>
              <ul className="space-y-2 lg:col-span-3">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="lg:col-span-2 lg:flex lg:justify-end">
                <TrackedButton
                  href={plan.href}
                  eventName="signup"
                  eventProps={{ location: plan.eventLocation, button_text: plan.cta }}
                  className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto ${
                    index === 1
                      ? "bg-emerald-600 text-white hover:bg-emerald-500"
                      : "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </TrackedButton>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
