import { DateTime } from "luxon";
import * as React from "react";
import { appUrl, formatCount, formatDate, plural } from "../format.js";
import { H1, HELP_URL, LedgerLayout, Note, P, PrimaryButton, Rows, ShareTable, StatGrid } from "./ledger.js";

/**
 * Sent to an organization's owners while its sites keep collecting after an unpaid trial:
 * when the grace period starts, halfway through, and in its last week.
 */
export type TrialGraceStage = "started" | "midway" | "final";

export interface TrialGraceSite {
  domain: string;
  visitors: number;
  pageviews: number;
}

export interface TrialGraceEmailProps {
  stage: TrialGraceStage;
  /** Owners of several organizations land on this one's billing page, not whichever is active. */
  organizationId: string;
  organizationName: string;
  trialEndedAt: Date;
  endsAt: Date;
  /** Every site in the organization, busiest first, with its traffic since the trial ended. */
  sites: TrialGraceSite[];
  now?: DateTime;
}

const MAX_LISTED_SITES = 5;

const utc = (date: Date) => DateTime.fromJSDate(date, { zone: "utc" });
const shortDate = (date: Date) => utc(date).toFormat("LLL d");

/** "acme.com", "acme.com and docs.acme.com", "your 4 sites" */
const sitesLabel = (sites: TrialGraceSite[]) => {
  if (sites.length === 0) return "your sites";
  if (sites.length === 1) return sites[0].domain;
  if (sites.length === 2) return `${sites[0].domain} and ${sites[1].domain}`;
  return `your ${sites.length} sites`;
};

const listedSites = (sites: TrialGraceSite[]) => {
  const listed = sites
    .slice(0, MAX_LISTED_SITES)
    .map(site => site.domain)
    .join(", ");
  const hidden = sites.length - MAX_LISTED_SITES;
  return hidden > 0 ? `${listed} and ${hidden} more` : listed;
};

const totals = (sites: TrialGraceSite[]) => ({
  visitors: sites.reduce((sum, site) => sum + site.visitors, 0),
  pageviews: sites.reduce((sum, site) => sum + site.pageviews, 0),
});

const daysLeft = (endsAt: Date, now: DateTime) => Math.max(1, Math.ceil(utc(endsAt).diff(now, "days").days));

export const trialGraceSubject = ({ stage, sites, endsAt }: TrialGraceEmailProps) => {
  if (stage === "started") {
    return `Your trial ended. Rybbit is still tracking ${sitesLabel(sites)}`;
  }
  if (stage === "final") {
    return `Your Rybbit data will be deleted after ${shortDate(endsAt)}`;
  }
  const { visitors } = totals(sites);
  if (visitors === 0) {
    return `Your Rybbit data is here until ${shortDate(endsAt)}`;
  }
  const prefix = sites.length === 1 ? `${sites[0].domain}: ` : "";
  return `${prefix}${plural(visitors, "visitor")} since your Rybbit trial ended`;
};

const preview = ({ stage, sites, endsAt, now = DateTime.utc() }: TrialGraceEmailProps) => {
  if (stage === "final") {
    return `${plural(daysLeft(endsAt, now), "day")} left. Pick a plan and everything you've collected carries over.`;
  }
  if (stage === "midway") {
    return `We'll keep tracking ${sitesLabel(sites)} until ${shortDate(endsAt)}. Pick a plan to keep the data.`;
  }
  return `Your data is here until ${shortDate(endsAt)}. Pick a plan to keep it.`;
};

const billingUrl = (organizationId: string) =>
  `${appUrl()}/settings/billing?organization=${encodeURIComponent(organizationId)}`;

const Started = ({ organizationId, organizationName, trialEndedAt, endsAt, sites }: TrialGraceEmailProps) => (
  <>
    <H1>Your trial ended, but we're still tracking {sitesLabel(sites)}</H1>
    <P>
      Your {organizationName} trial ended on {shortDate(trialEndedAt)}. We'll keep collecting data until{" "}
      {formatDate(utc(endsAt))}, so there's no gap if you decide to stay.
    </P>
    <Rows
      rows={[
        { label: "Trial ended", value: formatDate(utc(trialEndedAt)) },
        ...(sites.length > 0 ? [{ label: "Still tracking", value: listedSites(sites) }] : []),
        { label: "Data deleted after", value: formatDate(utc(endsAt)), strong: true },
      ]}
    />
    <P top={24}>
      Pick a plan before then and everything carries over. If you don't, tracking stops on {shortDate(endsAt)} and your
      data will be deleted.
    </P>
    <PrimaryButton label="Choose a plan" href={billingUrl(organizationId)} />
  </>
);

const Midway = ({
  organizationId,
  organizationName,
  trialEndedAt,
  endsAt,
  sites,
  now = DateTime.utc(),
}: TrialGraceEmailProps) => {
  const { visitors, pageviews } = totals(sites);
  const busiest = sites.filter(site => site.visitors > 0);
  const largest = busiest[0]?.visitors || 1;
  return (
    <>
      <H1>
        {visitors > 0
          ? `${sites.length === 1 ? sites[0].domain : "Your sites"} had ${plural(visitors, "visitor")} since your trial ended`
          : `Your data is still here until ${formatDate(utc(endsAt))}`}
      </H1>
      <Note top={8}>
        Since {shortDate(trialEndedAt)} · {organizationName}
      </Note>
      <StatGrid
        stats={[
          { label: "Visitors", value: formatCount(visitors) },
          { label: "Pageviews", value: formatCount(pageviews) },
          { label: "Days left", value: formatCount(daysLeft(endsAt, now)) },
        ]}
      />
      {busiest.length > 1 && (
        <ShareTable
          top={24}
          labelHeader="Site"
          valueHeader="Visitors"
          rows={busiest.slice(0, 10).map(site => ({
            label: site.domain,
            value: formatCount(site.visitors),
            share: (site.visitors / visitors) * 100,
            bar: (site.visitors / largest) * 100,
          }))}
        />
      )}
      <P top={24}>
        We'll keep collecting until {formatDate(utc(endsAt))}. After that, tracking stops and your data will be deleted.
        Pick a plan to keep it.
      </P>
      <PrimaryButton label="Choose a plan" href={billingUrl(organizationId)} />
    </>
  );
};

const Final = ({ organizationId, trialEndedAt, endsAt, sites, now = DateTime.utc() }: TrialGraceEmailProps) => {
  const { visitors, pageviews } = totals(sites);
  return (
    <>
      <H1>Your Rybbit data will be deleted after {formatDate(utc(endsAt))}</H1>
      <P>
        That's {plural(daysLeft(endsAt, now), "day")} from now. Tracking for {sitesLabel(sites)} stops the same day.
      </P>
      <Rows
        rows={[
          {
            label: `Since ${shortDate(trialEndedAt)}`,
            value: `${plural(visitors, "visitor")}, ${plural(pageviews, "pageview")}`,
          },
          ...(sites.length > 0 ? [{ label: sites.length === 1 ? "Site" : "Sites", value: listedSites(sites) }] : []),
          { label: "Deleted after", value: formatDate(utc(endsAt)), strong: true },
        ]}
      />
      <P top={24}>Pick a plan to keep it. Everything you've collected carries over.</P>
      <PrimaryButton label="Keep my data" href={billingUrl(organizationId)} />
    </>
  );
};

export const TrialGraceEmail = (props: TrialGraceEmailProps) => (
  <LedgerLayout
    preview={preview(props)}
    footer={[
      { label: "Help", href: HELP_URL },
      { label: "Billing", href: billingUrl(props.organizationId) },
    ]}
  >
    {props.stage === "started" ? (
      <Started {...props} />
    ) : props.stage === "midway" ? (
      <Midway {...props} />
    ) : (
      <Final {...props} />
    )}
    <Note>Questions? Just reply.</Note>
  </LedgerLayout>
);
