"use client";

import { SectionTitle, SignupButton, TextLink, pillNeutral, pillSmall } from "@/components/lp-b/primitives";
import { EVENT_TIERS, formatter, getFormattedPrice } from "@/components/PricingSection";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useState } from "react";

/**
 * The pricing band of the homepage redesign: the same quote instrument as
 * /pricing (billing toggle + events slider, prices from PricingSection's
 * tier table) in the redesign's register, with a compact card per plan.
 */
export function PricingB() {
  const t = useExtracted();
  const [isAnnual, setIsAnnual] = useState(true);
  const [tierIndex, setTierIndex] = useState(0);

  const eventLimit = EVENT_TIERS[tierIndex];
  const standard = getFormattedPrice(eventLimit, "standard");
  const pro = getFormattedPrice(eventLimit, "pro");
  const price = (quote: ReturnType<typeof getFormattedPrice>) =>
    quote.custom ? null : `$${isAnnual ? Math.round(quote.annual! / 12) : quote.monthly}`;

  const plans = [
    {
      name: t("Standard"),
      price: price(standard),
      blurb: t("What a small business needs to get started"),
      features: [
        t("Up to 5 websites"),
        t("Up to 3 team members"),
        t("Funnels, goals, journeys"),
        t("3 year data retention"),
      ],
      recommended: false,
      contact: standard.custom,
    },
    {
      name: t("Pro"),
      price: price(pro),
      blurb: t("Advanced features for professional teams"),
      features: [
        t("Everything in Standard"),
        t("Unlimited websites and members"),
        t("Session replays"),
        t("5 year data retention"),
      ],
      recommended: true,
      contact: pro.custom,
    },
    {
      name: t("Enterprise"),
      price: null,
      blurb: t("Advanced features for enterprise teams"),
      features: [t("Everything in Pro"), t("Single Sign-On (SSO)"), t("Dedicated isolated instance"), t("Uptime SLA")],
      recommended: false,
      contact: true,
    },
  ];

  const toggleClassName = (active: boolean) =>
    cn(
      "cursor-pointer rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
      active
        ? "bg-white font-medium text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white"
        : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
    );

  return (
    <>
      <SectionTitle
        id="lp-b-pricing"
        title={t("Set your traffic. See your price.")}
        description={t("Start your 7-day free trial. No credit card charges until the trial ends.")}
        aside={<TextLink href="/pricing">{t("See all plans")}</TextLink>}
      />

      <div className="flex flex-col gap-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-[#131313] sm:p-7 lg:flex-row lg:items-center lg:gap-14">
        <div className="flex shrink-0 items-center rounded-full border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            aria-pressed={!isAnnual}
            className={toggleClassName(!isAnnual)}
          >
            {t("Monthly")}
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            aria-pressed={isAnnual}
            className={cn(toggleClassName(isAnnual), "flex items-center gap-2")}
          >
            {t("Annual")}
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("4 months free")}</span>
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">{t("Events per month")}</span>
            <span className="text-xl font-semibold tabular-nums tracking-tight">
              {typeof eventLimit === "number" ? formatter(eventLimit) : t("Custom")}
            </span>
          </div>
          <Slider
            value={[tierIndex]}
            min={0}
            max={EVENT_TIERS.length - 1}
            step={1}
            onValueChange={value => setTierIndex(value[0])}
            aria-label={t("Events per month")}
            className="mb-3"
          />
          <div className="flex justify-between font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
            {EVENT_TIERS.map((tier, index) => (
              <span
                key={index}
                className={cn(
                  index !== 0 && index !== EVENT_TIERS.length - 1 && "hidden sm:inline",
                  tierIndex === index && "font-semibold text-emerald-700 dark:text-emerald-400"
                )}
              >
                {index === EVENT_TIERS.length - 1
                  ? "50M+"
                  : typeof tier === "number" && tier >= 1_000_000
                    ? `${tier / 1_000_000}M`
                    : typeof tier === "number"
                      ? `${tier / 1_000}K`
                      : t("Custom")}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 md:grid-cols-3">
        {plans.map((plan, index) => (
          <div
            key={plan.name}
            className={cn(
              "flex flex-col gap-4 p-7",
              index > 0 && "border-t border-neutral-200 dark:border-neutral-800 md:border-l md:border-t-0",
              plan.recommended && "bg-neutral-50 dark:bg-[#131313]"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold">{plan.name}</span>
              {plan.recommended && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {t("Recommended")}
                </span>
              )}
            </div>
            <div className="flex min-h-[60px] flex-col gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tabular-nums tracking-[-0.04em]">
                  {plan.price ?? t("Custom")}
                </span>
                {plan.price && <span className="text-sm text-neutral-500 dark:text-neutral-400">{t("/month")}</span>}
              </div>
              {plan.price && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {isAnnual ? t("Billed annually") : t("Billed monthly")}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{plan.blurb}</p>
            {plan.contact ? (
              <Link href="/contact" className={cn(pillNeutral, pillSmall)}>
                {t("Contact us")}
              </Link>
            ) : (
              <SignupButton
                location="pricing_b"
                label={t("Start free trial")}
                className={cn(pillSmall, !plan.recommended && pillNeutral)}
              />
            )}
            <ul className="flex flex-col gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
