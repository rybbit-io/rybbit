import { CheckCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import type { Metadata } from "next";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { createOGImageUrl } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Affiliate Program - Rybbit Analytics",
  description:
    "Earn 50% recurring commission for 12 months by referring customers to Rybbit, the open-source privacy-first analytics platform.",
  openGraph: {
    title: "Rybbit Affiliate Program",
    description:
      "Earn 50% recurring commission for 12 months by referring customers to Rybbit.",
    type: "website",
    url: "https://rybbit.com/affiliate",
    images: [createOGImageUrl("Rybbit Affiliate Program", "Earn 50% recurring commission for 12 months by referring customers to Rybbit.")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit Affiliate Program",
    description: "Earn 50% recurring commission for 12 months by referring customers to Rybbit.",
    images: [createOGImageUrl("Rybbit Affiliate Program", "Earn 50% recurring commission for 12 months by referring customers to Rybbit.")],
  },
  alternates: {
    canonical: "https://rybbit.com/affiliate",
  },
};

export default function AffiliatePage() {
  const t = useExtracted();

  const perks = [
    {
      title: t("50% Commission"),
      description: t("Earn 50% of every payment your referrals make"),
    },
    {
      title: t("12 Months Recurring"),
      description: t("Get paid every month for a full year per referral"),
    },
    {
      title: t("60-Day Cookie"),
      description: t("Generous 60-day attribution window on all referral links"),
    },
    {
      title: t("Monthly Payouts"),
      description: t("Reliable payouts every month via Rewardful"),
    },
  ];

  const steps = [
    {
      step: "1",
      title: t("Sign Up"),
      description: t("Create your free affiliate account and get your unique referral link."),
    },
    {
      step: "2",
      title: t("Share"),
      description: t("Share your link with your audience: blog posts, social media, newsletters, etc."),
    },
    {
      step: "3",
      title: t("Earn"),
      description: t("Earn 50% of every payment for 12 months when someone subscribes through your link."),
    },
  ];

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        title={t("50% Affiliate Program")}
        description={t("Earn 50% recurring commission for 12 months by referring customers to Rybbit.")}
        eventLocation="affiliate_hero"
        primaryAction={{
          href: "https://rybbit.getrewardful.com/signup",
          label: t("Join the Program"),
          eventName: "affiliate_signup_click",
          external: true,
        }}
        secondaryAction={null}
        note={null}
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label={t("50% Affiliate Program")}>
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map(perk => (
              <div key={perk.title} className="bg-white px-5 py-9 dark:bg-neutral-950 sm:px-8 lg:px-6 xl:px-8">
                <CheckCircle className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <h3 className="mt-5 font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                  {perk.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{perk.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-labelledby="affiliate-how">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />
          <div className="border-b border-neutral-200 px-5 py-10 dark:border-neutral-800 sm:px-8 lg:px-10">
            <h2 id="affiliate-how" className="text-2xl font-semibold tracking-tight md:text-3xl">
              {t("How It Works")}
            </h2>
          </div>
          <div className="grid gap-px bg-neutral-200 dark:bg-neutral-800 md:grid-cols-3">
            {steps.map(item => (
              <div key={item.step} className="bg-white px-5 py-10 dark:bg-neutral-950 sm:px-8 lg:px-10">
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-md bg-emerald-600 text-sm font-semibold text-white"
                >
                  {item.step}
                </span>
                <h3 className="mt-5 font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
