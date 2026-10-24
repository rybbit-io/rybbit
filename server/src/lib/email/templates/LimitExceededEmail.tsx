import { DateTime } from "luxon";
import * as React from "react";
import { appUrl, formatCount, formatDateTime, plural } from "../format.js";
import { usagePercent, usagePeriod, type UsageEmailProps } from "./ApproachingLimitEmail.js";
import { Badge, color, H1, HELP_URL, LedgerLayout, Meter, Note, P, PrimaryButton, Rows } from "./ledger.js";

const MAX_LISTED_SITES = 5;

const shortDate = (date: DateTime) => date.setZone("utc").toFormat("LLL d");

/**
 * Over the limit, ingestion stops for every site in the organization until the
 * month resets or the plan changes (a Stripe webhook refreshes the blocks
 * straight away). Dashboards and stored data stay readable throughout.
 */
export const LimitExceededEmail = ({
  organizationName,
  eventCount,
  eventLimit,
  sites,
  now = DateTime.utc(),
}: UsageEmailProps) => {
  const { start, reset } = usagePeriod(now);
  const domains = sites.map(site => site.domain);
  const listed = domains.slice(0, MAX_LISTED_SITES).join(", ");
  const hidden = domains.length - MAX_LISTED_SITES;
  const which =
    domains.length === 0 ? "its sites" : domains.length === 1 ? domains[0] : `its ${plural(domains.length, "site")}`;

  return (
    <LedgerLayout
      preview={`You went over your ${formatCount(eventLimit)}-event limit. Upgrade to start tracking again.`}
      footer={[
        { label: "Help", href: HELP_URL },
        { label: "Billing", href: `${appUrl()}/settings/billing` },
      ]}
    >
      <H1>Tracking is paused for {organizationName}</H1>
      <P>
        {organizationName} went over its {formatCount(eventLimit)}-event monthly limit, so Rybbit has stopped tracking{" "}
        {which}.
      </P>
      <div style={{ marginTop: 24 }}>
        <Badge tone="danger">Paused</Badge>
        <span style={{ paddingLeft: 8, fontSize: 13, lineHeight: "20px", color: color.muted }}>
          since {now.setZone("utc").toFormat("LLL d, HH:mm 'UTC'")}
        </span>
      </div>
      <Meter
        top={16}
        used={formatCount(eventCount)}
        of={`${formatCount(eventLimit)} events`}
        percent={usagePercent(eventCount, eventLimit)}
        barColor={color.danger}
        startLabel={shortDate(start)}
        endLabel={`Resets ${shortDate(reset)}`}
      />
      <Rows
        rows={[
          { label: "Paused since", value: formatDateTime(now) },
          ...(domains.length > 0
            ? [{ label: "Sites affected", value: hidden > 0 ? `${listed} and ${hidden} more` : listed }]
            : []),
          { label: "Resumes", value: `${shortDate(reset)}, or as soon as you upgrade`, strong: true },
        ]}
      />
      <P top={24}>Your dashboards and existing data are still available.</P>
      <PrimaryButton label="Upgrade and resume tracking" href={`${appUrl()}/settings/billing`} />
      <Note>Questions? Just reply.</Note>
    </LedgerLayout>
  );
};
