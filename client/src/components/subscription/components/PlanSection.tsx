import { useExtracted, useLocale } from "next-intl";
import { LedgerRow, LedgerRows, LedgerSection } from "@/app/settings/components/Ledger";
import { DEFAULT_EVENT_LIMIT } from "@/lib/subscription/constants";
import { SubscriptionData } from "@/lib/subscription/useStripeSubscription";
import { useOrgUsage } from "./useOrgUsage";

/** The billing page's opening section: one "Current plan" row with the plan, its status and its action. */
export function PlanSection({
  name,
  price,
  description,
  status,
  details,
  action,
}: {
  name: React.ReactNode;
  /** e.g. "$99/month", set beside the name. */
  price?: React.ReactNode;
  /** Under the row label, e.g. how the plan is billed. */
  description?: React.ReactNode;
  /** What happens next: renewal, trial end, cancellation. */
  status?: React.ReactNode;
  /** What the plan includes. */
  details?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const t = useExtracted();

  return (
    <LedgerSection title={t("Plan")}>
      <LedgerRows>
        <LedgerRow label={t("Current plan")} description={description}>
          <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-base font-semibold tracking-tight">{name}</span>
            {price && <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">{price}</span>}
            {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
          </div>
          {status && (
            <p className="mt-1 max-w-[62ch] text-sm leading-5 text-neutral-700 dark:text-neutral-300">{status}</p>
          )}
          {details && (
            <p className="mt-0.5 max-w-[62ch] text-xs leading-4 text-neutral-500 dark:text-neutral-400">{details}</p>
          )}
        </LedgerRow>
      </LedgerRows>
    </LedgerSection>
  );
}

/** One line listing what a plan includes: events a month, sites, members and org API requests a day. */
export function PlanAllowances({ subscription }: { subscription: SubscriptionData }) {
  const t = useExtracted();
  const locale = useLocale();
  const { apiUsage } = useOrgUsage();
  const number = new Intl.NumberFormat(locale);

  const parts = [t("{count} events a month", { count: number.format(subscription.eventLimit || DEFAULT_EVENT_LIMIT) })];
  if (subscription.siteLimit == null && subscription.memberLimit == null) {
    parts.push(t("unlimited sites and members"));
  } else {
    parts.push(
      subscription.siteLimit == null
        ? t("unlimited sites")
        : t("{count, plural, one {# site} other {# sites}}", { count: subscription.siteLimit }),
      subscription.memberLimit == null
        ? t("unlimited members")
        : t("{count, plural, one {# member} other {# members}}", { count: subscription.memberLimit })
    );
  }
  if (apiUsage) {
    parts.push(t("{count} org API requests a day", { count: number.format(apiUsage.dailyLimit) }));
  }

  return <>{parts.join(" · ")}</>;
}
