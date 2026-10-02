import { useExtracted } from "next-intl";
import { useStripeSubscription } from "../../../lib/subscription/useStripeSubscription";

export function PricingHeader() {
  const t = useExtracted();
  const { data: subscription } = useStripeSubscription();

  // An organization that already had a subscription gets plans, not another trial.
  if (subscription?.trialEligible === false) {
    return (
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight pb-4 text-transparent bg-clip-text bg-linear-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-200 dark:to-gray-400">
          {t("Choose a plan")}
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-6">
          {t("Pick up where you left off. You can cancel anytime.")}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-10 text-center max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight pb-4 text-transparent bg-clip-text bg-linear-to-b from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-gray-200 dark:to-gray-400">
        {t("Start for Free")}
      </h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-6">
        {t("Start your 7-day free trial — no credit card charges until the trial ends.")}
      </p>
    </div>
  );
}
