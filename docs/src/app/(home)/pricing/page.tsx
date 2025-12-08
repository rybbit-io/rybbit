import { PricingSection } from "@/components/PricingSection";
import { ComparisonSection } from "./components/ComparisonSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Rybbit pricing plans and features",
};

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center justify-center overflow-x-hidden">
      <PricingSection />
      <ComparisonSection />

      {/* FAQ section */}
      <div className="max-w-lg mx-auto px-4 pb-16">
        <div className="mt-10 space-y-6">
          <h3 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
            Frequently Asked Questions
          </h3>

          <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">Can I change my plan later?</h4>
            <p className="text-neutral-600 dark:text-neutral-300">
              Absolutely. You can upgrade, downgrade, or cancel your plan at any time through your account settings.
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-medium mb-2 text-neutral-900 dark:text-neutral-100">
              What happens if I go over my event limit?
            </h4>
            <p className="text-neutral-600 dark:text-neutral-300">
              We&apos;ll notify you when you&apos;re approaching your limit. You can either upgrade to a higher plan or
              continue with your current plan (events beyond the limit won&apos;t be tracked).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
