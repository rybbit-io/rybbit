"use client";

import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { GridCrosses } from "@/components/GridCrosses";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getCalApi } from "@calcom/embed-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "../lib/const";
import { PricingCard } from "./PricingCard";

// Available event tiers for the slider
const EVENT_TIERS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 20_000_000, 30_000_000, 40_000_000, 50_000_000, "Custom"];

export const formatter = Intl.NumberFormat("en", {
  notation: "compact",
}).format;

// Format price with dollar sign for Basic, Standard, and Pro
function getFormattedPrice(eventLimit: number | string, planType: "standard" | "pro") {
  // Monthly prices
  let monthlyPrice;
  if (typeof eventLimit === "string") return { custom: true }; // Custom pricing

  if (planType === "standard") {
    // Standard tier prices
    if (eventLimit <= 100_000) monthlyPrice = 19;
    else if (eventLimit <= 250_000) monthlyPrice = 29;
    else if (eventLimit <= 500_000) monthlyPrice = 49;
    else if (eventLimit <= 1_000_000) monthlyPrice = 69;
    else if (eventLimit <= 2_000_000) monthlyPrice = 99;
    else if (eventLimit <= 5_000_000) monthlyPrice = 149;
    else if (eventLimit <= 10_000_000) monthlyPrice = 249;
    else if (eventLimit <= 20_000_000) monthlyPrice = 399;
    else if (eventLimit <= 30_000_000) monthlyPrice = 549;
    else if (eventLimit <= 40_000_000) monthlyPrice = 699;
    else if (eventLimit <= 50_000_000) monthlyPrice = 849;
    else return { custom: true };
  } else {
    // Pro tier prices (roughly double)
    if (eventLimit <= 100_000) monthlyPrice = 39;
    else if (eventLimit <= 250_000) monthlyPrice = 59;
    else if (eventLimit <= 500_000) monthlyPrice = 99;
    else if (eventLimit <= 1_000_000) monthlyPrice = 139;
    else if (eventLimit <= 2_000_000) monthlyPrice = 199;
    else if (eventLimit <= 5_000_000) monthlyPrice = 299;
    else if (eventLimit <= 10_000_000) monthlyPrice = 499;
    else if (eventLimit <= 20_000_000) monthlyPrice = 799;
    else if (eventLimit <= 30_000_000) monthlyPrice = 1099;
    else if (eventLimit <= 40_000_000) monthlyPrice = 1399;
    else if (eventLimit <= 50_000_000) monthlyPrice = 1699;
    else return { custom: true };
  }

  // Annual prices are 8 monthly (4 months free)
  const annualPrice = monthlyPrice * 8;
  return {
    monthly: monthlyPrice,
    annual: annualPrice,
    custom: false,
  };
}

export function PricingSection({ isAnnual, setIsAnnual }: { isAnnual: boolean, setIsAnnual: (isAnnual: boolean) => void }) {
  const t = useExtracted();
  const [eventLimitIndex, setEventLimitIndex] = useState(0); // Default to 100k (index 0)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const updateCurrentSlide = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };

    queueMicrotask(updateCurrentSlide);
    carouselApi.on("select", updateCurrentSlide);
    return () => {
      carouselApi.off("select", updateCurrentSlide);
    };
  }, [carouselApi]);

  const slideCount = carouselApi?.scrollSnapList().length ?? 0;

  const STANDARD_FEATURES = [
    t("Up to {count} websites", { count: String(STANDARD_SITE_LIMIT) }),
    t("Up to {count} team members", { count: String(STANDARD_TEAM_LIMIT) }),
    t("Custom events"),
    t("Funnels"),
    t("Goals"),
    t("Journeys"),
    t("Web vitals"),
    t("Error tracking"),
    t("User profiles"),
    t("Retention"),
    t("Sessions"),
    t("Email reports"),
    t("3 year data retention"),
    t("API access"),
    t("Email support"),
  ];

  const PRO_FEATURES = [
    t("Everything in Standard"),
    t("Unlimited websites"),
    t("Unlimited team members"),
    t("Session replays"),
    t("5 year data retention"),
    t("10x higher API rate limit"),
    t("Priority support"),
  ];

  const ENTERPRISE_FEATURES = [
    t("Everything in Pro"),
    t("Single Sign-On (SSO)"),
    t("Infinite data retention"),
    t("Dedicated isolated instance"),
    t("On-premise installation"),
    t("Custom features"),
    t("Whitelabeling"),
    t("Manual invoicing"),
    t("Uptime SLA"),
    t("Enterprise support"),
    t("Slack/live chat support"),
  ];

  const eventLimit = EVENT_TIERS[eventLimitIndex];
  const standardPrices = getFormattedPrice(eventLimit, "standard");
  const proPrices = getFormattedPrice(eventLimit, "pro");

  // Initialize Cal.com embed
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "secret" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  // Handle slider changes
  function handleSliderChange(value: number[]) {
    setEventLimitIndex(value[0]);
  }

  return (
    <section className="relative z-10 border-b border-neutral-200 dark:border-neutral-800">
      <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 px-5 py-16 dark:border-neutral-800 sm:px-8 md:py-24 lg:px-10">
        <GridCrosses />
        <div className="mb-14 grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 className="text-4xl font-semibold leading-[1.04] tracking-[-0.035em] md:text-5xl lg:col-span-4">
            {t("Pricing")}
          </h2>
          <p className="max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-400 lg:col-span-8">
            {t("Start your 7-day free trial — no credit card charges until the trial ends.")}
          </p>
        </div>

        {/* Shared controls section */}
        <div className="mb-10 border-y border-neutral-200 py-8 dark:border-neutral-800">
          <div className="mb-7 flex items-end justify-between gap-5">
            <div>
              <h3 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">{t("Monthly pageviews")}</h3>
              <div className="text-3xl font-semibold tabular-nums tracking-tight">
                {typeof eventLimit === "number" ? eventLimit.toLocaleString() : t("Custom")}
              </div>
            </div>
            <div className="relative flex flex-col items-end">
              {/* Billing toggle */}
              <div className="mb-2 flex rounded-md border border-neutral-300 bg-neutral-100 p-1 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={cn(
                    "cursor-pointer rounded-sm px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
                    !isAnnual
                      ? "bg-white text-neutral-950 dark:bg-neutral-800 dark:text-white font-medium"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {t("Monthly")}
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={cn(
                    "cursor-pointer rounded-sm px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500",
                    isAnnual
                      ? "bg-white text-neutral-950 dark:bg-neutral-800 dark:text-white font-medium"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {t("Annual")}
                </button>
                <div className="absolute right-0 top-0 -translate-y-4 whitespace-nowrap rounded-sm bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                  {t("4 months free")}
                </div>
              </div>
            </div>
          </div>

          {/* Slider */}
          <Slider
            defaultValue={[0]}
            max={EVENT_TIERS.length - 1}
            min={0}
            step={1}
            onValueChange={handleSliderChange}
            className="mb-3"
          />

          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
            {EVENT_TIERS.map((tier, index) => (
              <span key={index} className={cn(eventLimitIndex === index && "font-semibold text-emerald-700 dark:text-emerald-400")}>
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

        {/* Pricing cards - carousel on mobile, grid on desktop */}
        {(() => {
          const standardCard = (
            <PricingCard
              title={t("Standard")}
              description={t("Everything you need to get started as a small business")}
              priceDisplay={
                standardPrices.custom ? (
                  <div className="text-3xl font-bold">{t("Custom")}</div>
                ) : (
                  <div>
                    <span className="text-3xl font-bold">
                      ${isAnnual ? Math.round(standardPrices.annual! / 12) : standardPrices.monthly}
                    </span>
                    <span className="ml-1 text-neutral-400">{t("/month")}</span>
                  </div>
                )
              }
              buttonText={standardPrices.custom ? t("Contact us") : t("Start for $0")}
              buttonHref={standardPrices.custom ? "https://www.rybbit.com/contact" : "https://app.rybbit.io/signup"}
              features={STANDARD_FEATURES}
              eventLocation={standardPrices.custom ? undefined : "standard"}
            />
          );

          const proCard = (
            <PricingCard
              title={t("Pro")}
              description={t("Advanced features for professional teams")}
              priceDisplay={
                proPrices.custom ? (
                  <div className="text-3xl font-bold">{t("Custom")}</div>
                ) : (
                  <div>
                    <span className="text-3xl font-bold">
                      ${isAnnual ? Math.round(proPrices.annual! / 12) : proPrices.monthly}
                    </span>
                    <span className="ml-1 text-neutral-400">{t("/month")}</span>
                  </div>
                )
              }
              buttonText={proPrices.custom ? t("Contact us") : t("Start for $0")}
              buttonHref={proPrices.custom ? "https://www.rybbit.com/contact" : "https://app.rybbit.io/signup"}
              features={PRO_FEATURES}
              eventLocation={proPrices.custom ? undefined : "pro"}
              recommended={true}
            />
          );

          const enterpriseCard = (
            <PricingCard
              title={t("Enterprise")}
              description={t("Advanced features for enterprise teams")}
              priceDisplay={<div className="text-3xl font-bold">{t("Custom")}</div>}
              features={ENTERPRISE_FEATURES}
              buttonText={t("Contact us")}
              buttonHref={"https://www.rybbit.com/contact"}
            />
          );

          return (
            <>
              {/* Mobile carousel */}
              <div className="min-[700px]:hidden">
                <Carousel setApi={setCarouselApi} opts={{ startIndex: 1 }}>
                  <CarouselContent>
                    <CarouselItem>{standardCard}</CarouselItem>
                    <CarouselItem>{proCard}</CarouselItem>
                    <CarouselItem>{enterpriseCard}</CarouselItem>
                  </CarouselContent>
                </Carousel>
                {/* Dot indicators */}
                <div className="mt-4 flex justify-center gap-2">
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => carouselApi?.scrollTo(i)}
                      aria-label={t("Go to pricing option {number}", { number: String(i + 1) })}
                      className={cn(
                        "size-2 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                        currentSlide === i
                          ? "bg-emerald-500"
                          : "bg-neutral-400 dark:bg-neutral-600"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop grid */}
              <div className="mx-auto hidden items-stretch justify-center gap-3 min-[700px]:grid min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3">
                {standardCard}
                {proCard}
                {enterpriseCard}
              </div>
            </>
          );
        })()}
      </div>
    </section>
  );
}
