import { AlertTriangle } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted, useLocale } from "next-intl";
import { LedgerRow, LedgerRows, LedgerSection } from "@/app/settings/components/Ledger";
import { DEFAULT_EVENT_LIMIT } from "@/lib/subscription/constants";
import { SubscriptionData } from "@/lib/subscription/useStripeSubscription";
import { cn } from "@/lib/utils";
import { useOrgUsage } from "./useOrgUsage";

type UsageLevel = "normal" | "warn" | "over";

function usageLevel(used: number, limit: number): UsageLevel {
  if (used >= limit) return "over";
  if (used / limit >= 0.8) return "warn";
  return "normal";
}

const METER_FILL: Record<UsageLevel, string> = {
  normal: "bg-dataviz",
  warn: "bg-yellow-500",
  over: "bg-red-500",
};

const LEVEL_TEXT: Record<UsageLevel, string> = {
  normal: "text-neutral-600 dark:text-neutral-300",
  warn: "text-yellow-700 dark:text-yellow-400",
  over: "text-red-600 dark:text-red-400",
};

function UsageMeter({
  label,
  used,
  limit,
  unavailable,
  showPercent = true,
}: {
  /** Accessible name of the meter. */
  label: string;
  used: number;
  limit: number;
  /** The count could not be read: shows a placeholder instead of a false zero. */
  unavailable?: boolean;
  showPercent?: boolean;
}) {
  const t = useExtracted();
  const locale = useLocale();
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const level = unavailable ? "normal" : usageLevel(used, limit);
  const ratio = unavailable ? 0 : used / limit;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm leading-5 md:pt-2">
        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
          {t.rich("<strong>{used}</strong> of {limit}", {
            used: unavailable ? "—" : number.format(used),
            limit: number.format(limit),
            strong: chunks => <span className="font-medium text-neutral-900 dark:text-neutral-50">{chunks}</span>,
          })}
        </span>
        {showPercent && !unavailable && (
          // Rounded down, so 99.6% never reads as a full 100% while there is still room.
          <span className={cn("font-medium tabular-nums", LEVEL_TEXT[level])}>
            {percent.format(Math.floor(ratio * 100) / 100)}
          </span>
        )}
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={unavailable ? undefined : Math.min(used, limit)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-150 dark:bg-neutral-800"
      >
        <div
          className={cn("h-full rounded-full", METER_FILL[level])}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
      </div>
    </div>
  );
}

function LimitNote({
  level,
  children,
  action,
}: {
  level: "warn" | "over";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="flex max-w-[68ch] items-start gap-1.5 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
        <AlertTriangle aria-hidden className={cn("mt-0.5 size-3.5 shrink-0", LEVEL_TEXT[level])} />
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-4 text-neutral-500 dark:text-neutral-400">{children}</p>;
}

/**
 * How much of its plan the organization has used this month: events against the monthly limit
 * (with a projection at the current pace), sites, members and today's org API requests.
 */
export function UsageSection({
  subscription,
  planName,
  nearLimitHint,
  overLimitHint,
  overLimitAction,
}: {
  subscription: SubscriptionData;
  /** Shown as "Unlimited on {plan}" for limits the plan doesn't have. */
  planName: string;
  /** Follows the warning when events are near or on pace to reach the limit. */
  nearLimitHint?: React.ReactNode;
  /** Follows the warning once events have reached the limit. */
  overLimitHint?: React.ReactNode;
  /** A control beside the over-limit warning, e.g. to upgrade. */
  overLimitAction?: React.ReactNode;
}) {
  const t = useExtracted();
  const locale = useLocale();
  const { siteCount, memberCount, apiUsage } = useOrgUsage();
  const number = new Intl.NumberFormat(locale);
  const day = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });

  // monthlyEventCount covers the current calendar month in UTC (the usage service's window),
  // not the billing period, so the month and the projection are worked out in UTC too.
  const now = DateTime.utc();
  const monthStart = now.startOf("month");
  const nextMonth = monthStart.plus({ months: 1 });
  const daysInMonth = now.daysInMonth ?? 30;
  const elapsedDays = now.diff(monthStart, "days").days;

  const used = subscription.monthlyEventCount || 0;
  const limit = subscription.eventLimit || DEFAULT_EVENT_LIMIT;
  const level = usageLevel(used, limit);

  // Once a full day is in, extrapolate the month's daily average; only worth saying when the
  // limit would be reached before the count resets.
  let limitDate: DateTime | null = null;
  if (level !== "over" && used > 0 && elapsedDays >= 1) {
    const reachedAt = now.plus({ days: (limit - used) / (used / elapsedDays) });
    if (reachedAt < nextMonth) limitDate = reachedAt;
  }

  const renderCount = (count: number | undefined, countLimit: number | null, label: string) =>
    countLimit == null ? (
      <div className="flex min-h-9 flex-wrap items-center gap-x-3 text-sm">
        <span className="font-medium tabular-nums">{count === undefined ? "—" : number.format(count)}</span>
        <span className="text-neutral-500 dark:text-neutral-400">{t("Unlimited on {plan}", { plan: planName })}</span>
      </div>
    ) : (
      <UsageMeter
        label={label}
        used={count ?? 0}
        limit={countLimit}
        unavailable={count === undefined}
        showPercent={false}
      />
    );

  return (
    <LedgerSection
      title={t("Usage this month")}
      description={t("Events are counted per calendar month in UTC and reset on the 1st.")}
      actions={
        <span className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
          {t("{range} · day {day} of {days}", {
            range: day.formatRange(monthStart.toJSDate(), nextMonth.minus({ days: 1 }).toJSDate()),
            day: number.format(now.day),
            days: number.format(daysInMonth),
          })}
        </span>
      }
    >
      <LedgerRows>
        <LedgerRow label={t("Events")} description={t("Pageviews and events across all sites.")}>
          <UsageMeter label={t("Events used this month")} used={used} limit={limit} />
          {level === "over" ? (
            <LimitNote level="over" action={overLimitAction}>
              {t(
                "You've reached this month's limit. Events past it aren't recorded until the count resets on {date}.",
                {
                  date: day.format(nextMonth.toJSDate()),
                }
              )}
              {overLimitHint && <> {overLimitHint}</>}
            </LimitNote>
          ) : limitDate ? (
            <LimitNote level="warn">
              {limitDate.hasSame(now, "day")
                ? t("At this pace you'll reach the limit later today.")
                : t("At this pace you'll reach the limit around {date}.", { date: day.format(limitDate.toJSDate()) })}
              {nearLimitHint && <> {nearLimitHint}</>}
            </LimitNote>
          ) : level === "warn" ? (
            <LimitNote level="warn">
              {t("You're close to this month's limit.")}
              {nearLimitHint && <> {nearLimitHint}</>}
            </LimitNote>
          ) : null}
        </LedgerRow>
        <LedgerRow label={t("Sites")} description={t("Websites tracked by this organization.")}>
          {renderCount(siteCount, subscription.siteLimit, t("Sites used"))}
        </LedgerRow>
        <LedgerRow label={t("Members")} description={t("People in this organization.")}>
          {renderCount(memberCount, subscription.memberLimit, t("Member seats used"))}
        </LedgerRow>
        {apiUsage && (
          <LedgerRow label={t("Org API requests today")} description={t("Calls made with organization API keys.")}>
            <UsageMeter
              label={t("Organization API requests today")}
              used={apiUsage.dailyUsed}
              limit={apiUsage.dailyLimit}
              unavailable={!apiUsage.available}
            />
            <Note>
              {apiUsage.available
                ? t("Resets daily.")
                : t("Today's count couldn't be read. The daily limit still applies.")}
            </Note>
          </LedgerRow>
        )}
      </LedgerRows>
    </LedgerSection>
  );
}
