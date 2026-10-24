import { DateTime } from "luxon";
import * as React from "react";
import { appUrl, formatCount, formatDate, plural } from "../format.js";
import { color, H1, H2, HELP_URL, LedgerLayout, Meter, P, PrimaryButton, Rows, ShareTable } from "./ledger.js";

export interface SiteUsage {
  domain: string;
  events: number;
}

export interface UsageEmailProps {
  organizationName: string;
  eventCount: number;
  eventLimit: number;
  /** The organization's sites with this month's events, largest first. */
  sites: SiteUsage[];
  now?: DateTime;
}

const MAX_SITE_ROWS = 5;

/** Usage is counted per calendar month (UTC), so the limit resets on the 1st. */
export const usagePeriod = (now: DateTime) => {
  const utc = now.setZone("utc");
  const start = utc.startOf("month");
  const reset = start.plus({ months: 1 });
  return { start, reset, daysLeft: Math.max(0, Math.ceil(reset.diff(utc, "days").days)) };
};

/** When the limit will be reached at this month's average daily rate, if before the reset. */
export const projectedLimitDate = (eventCount: number, eventLimit: number, now: DateTime): DateTime | null => {
  const { start, reset } = usagePeriod(now);
  const daysElapsed = now.diff(start, "days").days;
  if (daysElapsed < 1 || eventCount <= 0 || eventCount >= eventLimit) return null;
  const perDay = eventCount / daysElapsed;
  const date = now.plus({ days: (eventLimit - eventCount) / perDay });
  return date < reset ? date : null;
};

export const usagePercent = (eventCount: number, eventLimit: number) =>
  eventLimit > 0 ? Math.floor((eventCount / eventLimit) * 100) : 100;

export const approachingLimitSubject = (
  organizationName: string,
  eventCount: number,
  eventLimit: number,
  now = DateTime.utc()
) =>
  `${organizationName} has used ${usagePercent(eventCount, eventLimit)}% of its ${now.setZone("utc").toFormat("LLLL")} events`;

const shortDate = (date: DateTime) => date.setZone("utc").toFormat("LLL d");

export const ApproachingLimitEmail = ({
  organizationName,
  eventCount,
  eventLimit,
  sites,
  now = DateTime.utc(),
}: UsageEmailProps) => {
  const { start, reset, daysLeft } = usagePeriod(now);
  const percent = usagePercent(eventCount, eventLimit);
  const projected = projectedLimitDate(eventCount, eventLimit, now);
  const month = now.setZone("utc").toFormat("LLLL");
  const total = sites.reduce((sum, site) => sum + site.events, 0);
  const top = sites.slice(0, MAX_SITE_ROWS);
  const largest = top[0]?.events || 1;

  return (
    <LedgerLayout
      preview={
        projected
          ? `At this rate you'll hit your ${formatCount(eventLimit)}-event limit around ${shortDate(projected)}.`
          : `${formatCount(eventCount)} of ${formatCount(eventLimit)} events used, with ${plural(daysLeft, "day")} left in ${month}.`
      }
      footer={[
        { label: "Help", href: HELP_URL },
        { label: "Billing", href: `${appUrl()}/settings/billing` },
      ]}
    >
      <H1>
        {organizationName} has used {percent}% of this month's events
      </H1>
      <P>
        That's {formatCount(eventCount)} of {formatCount(eventLimit)} events, with {plural(daysLeft, "day")} left in{" "}
        {month}.{projected ? ` At this rate you'll hit the limit around ${shortDate(projected)}.` : ""}
      </P>
      <Meter
        used={formatCount(eventCount)}
        of={`${formatCount(eventLimit)} events`}
        percent={percent}
        barColor={color.warning}
        startLabel={shortDate(start)}
        endLabel={`Resets ${shortDate(reset)}`}
      />
      <Rows
        rows={[
          { label: "Used", value: `${formatCount(eventCount)} events (${percent}%)` },
          { label: "Plan limit", value: `${formatCount(eventLimit)} events a month` },
          { label: "Resets", value: formatDate(reset) },
          ...(projected
            ? [{ label: "At this pace", value: `Limit reached around ${shortDate(projected)}`, strong: true }]
            : []),
        ]}
      />
      <P top={24}>
        If you hit the limit, Rybbit stops tracking until your plan resets on {shortDate(reset)}. Your existing data
        stays available.
      </P>
      {sites.length > 1 && (
        <>
          <H2>By site</H2>
          <ShareTable
            labelHeader="Site"
            valueHeader="Events"
            rows={top.map(site => ({
              label: site.domain,
              value: formatCount(site.events),
              share: total > 0 ? (site.events / total) * 100 : null,
              bar: (site.events / largest) * 100,
            }))}
          />
          {sites.length > MAX_SITE_ROWS && (
            <P top={12}>
              <span style={{ fontSize: 13, color: color.muted }}>
                Plus {plural(sites.length - MAX_SITE_ROWS, "more site")}.
              </span>
            </P>
          )}
        </>
      )}
      <PrimaryButton top={40} label="Upgrade plan" href={`${appUrl()}/settings/billing`} />
    </LedgerLayout>
  );
};
