import { BackgroundGrid } from "@/components/BackgroundGrid";
import { CheckCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import { Tilt_Warp } from "next/font/google";
import { TrackedButton } from "@/components/TrackedButton";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { createOGImageUrl } from "@/lib/metadata";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

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

  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden pt-16 md:pt-24">
      <BackgroundGrid />
      <div className="relative flex flex-col py-8">
        <h1
          className={cn(
            "relative z-10 text-4xl md:text-5xl lg:text-7xl font-medium px-4 tracking-tight max-w-4xl text-center text-transparent bg-clip-text bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-100 dark:to-gray-400",
            tilt_wrap.className
          )}
        >
          {t("50% Affiliate Program")}
        </h1>
        <h2 className="relative z-10 text-base md:text-xl pt-4 md:pt-6 px-4 tracking-tight max-w-4xl text-center text-neutral-600 dark:text-neutral-300 font-light">
          {t("Earn 50% recurring commission for 12 months by referring customers to Rybbit.")}
        </h2>

        <div className="relative z-10 flex flex-col items-center my-8 md:my-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 text-base md:text-lg px-4">
            <TrackedButton
              href="https://rybbit.getrewardful.com/signup"
              eventName="affiliate_signup_click"
              eventProps={{
                location: "hero",
                button_text: "Join the Program",
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-3 rounded-lg shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 cursor-pointer"
            >
              {t("Join the Program")}
            </TrackedButton>
          </div>
        </div>
      </div>

      {/* Perks Grid */}
      <section className="py-12 w-full max-w-5xl mx-auto px-4 z-10">
        <div className="bg-neutral-200/40 dark:bg-neutral-900/40 p-2 rounded-3xl border border-neutral-300 dark:border-neutral-800">
          <div className="bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm rounded-2xl border border-neutral-300 dark:border-neutral-800 p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {perks.map((perk) => (
                <div key={perk.title} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-neutral-900 dark:text-white">
                      {perk.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {perk.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="pb-16 w-full max-w-5xl mx-auto px-4 z-10">
        <h3 className="text-2xl font-medium text-center mb-8 text-neutral-900 dark:text-white">
          {t("How It Works")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: t("Sign Up"),
              description: t("Create your free affiliate account and get your unique referral link."),
            },
            {
              step: "2",
              title: t("Share"),
              description: t("Share your link with your audience — blog posts, social media, newsletters, etc."),
            },
            {
              step: "3",
              title: t("Earn"),
              description: t("Earn 50% of every payment for 12 months when someone subscribes through your link."),
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-6 text-center"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-medium flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h4 className="font-medium text-neutral-900 dark:text-white mb-1">
                {item.title}
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
