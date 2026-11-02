import { DateTime } from "luxon";
import * as React from "react";
import type { DigestSite, WeeklyDigest } from "../../../services/weekyReports/weeklyReportTypes.js";
import { appUrl, formatChange, formatCount, formatDateTime, percentChange, plural } from "../format.js";
import { Bar, color, H1, H2, LedgerLayout, Note, P, PrimaryButton, Rows, tableAttrs, TextLink } from "./ledger.js";
import { changeWords, formatWeekRange, visitorsPhrase } from "./WeeklyReportEmail.js";

interface WeeklyDigestEmailProps {
  digest: WeeklyDigest;
  unsubscribeUrl: string;
}

const MAX_ROWS = 20;
// Someone whose sites all went dark at once (a domain lapsing, say) would otherwise get one row each.
const MAX_QUIET_ROWS = 10;
const SPARK_HEIGHT = 24;

const isQuiet = (site: DigestSite) => site.lastPageviewAt !== null;

const totals = (sites: DigestSite[]) => ({
  users: sites.reduce((sum, site) => sum + site.users, 0),
  previousUsers: sites.reduce((sum, site) => sum + site.previousUsers, 0),
});

/** The organization every site belongs to, or null when the digest spans several. */
const soleOrganization = (sites: DigestSite[]) =>
  sites.every(site => site.organizationId === sites[0]?.organizationId) ? (sites[0]?.organizationName ?? null) : null;

export const weeklyDigestSubject = ({ sites }: WeeklyDigest) => {
  const { users } = totals(sites);
  const org = soleOrganization(sites);
  return `${org ? `${org} last week` : "Last week"}: ${visitorsPhrase(users)} across ${sites.length} sites`;
};

/** The site that grew the most, then any that went quiet. */
export const weeklyDigestPreview = (digest: WeeklyDigest) => {
  const grower = digest.sites
    .filter(site => !isQuiet(site) && site.previousUsers > 0 && site.users > site.previousUsers)
    .sort((a, b) => (percentChange(b.users, b.previousUsers) ?? 0) - (percentChange(a.users, a.previousUsers) ?? 0))[0];
  const quiet = digest.sites.filter(isQuiet);
  return [
    grower && `${grower.siteDomain} ${changeWords(percentChange(grower.users, grower.previousUsers))}`,
    quiet.length === 1 && `${quiet[0].siteDomain} had no pageviews all week`,
    quiet.length > 1 && `${quiet.length} sites had no pageviews all week`,
    formatWeekRange(digest.weekStart, digest.weekEnd),
  ]
    .filter(Boolean)
    .join(" · ");
};

/** Seven sessions-per-day bars, right-aligned in an 80px cell. */
const Sparkline = ({ daily }: { daily: number[] }) => {
  const max = Math.max(1, ...daily);
  return (
    <table
      {...tableAttrs}
      align="right"
      role="img"
      aria-label={`Sessions per day: ${daily.map(formatCount).join(", ")}`}
    >
      <tbody>
        <tr>
          {daily.map((sessions, i) => (
            <td
              key={i}
              valign="bottom"
              height={SPARK_HEIGHT}
              style={{ height: SPARK_HEIGHT, verticalAlign: "bottom", paddingLeft: i > 0 ? 2 : 0 }}
            >
              {sessions > 0 && (
                <Bar width={6} height={Math.max(2, Math.round((sessions / max) * SPARK_HEIGHT))} fill={color.data} />
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

const NoDataPill = () => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 6px",
      borderRadius: 3,
      fontSize: 11,
      lineHeight: "14px",
      fontWeight: 600,
      backgroundColor: color.fill,
      border: `1px solid ${color.rule}`,
      color: color.muted,
    }}
  >
    No data
  </span>
);

const ChangeCell = ({ site }: { site: DigestSite }) => {
  const change = percentChange(site.users, site.previousUsers);
  if (change === null) return <span style={{ color: color.muted }}>–</span>;
  const rounded = Math.round(change * 10) / 10;
  return (
    <span style={{ color: rounded === 0 ? color.muted : rounded > 0 ? color.up : color.down }}>
      {formatChange(change)}
    </span>
  );
};

const SiteTable = ({ sites, top }: { sites: DigestSite[]; top: number }) => {
  const header = {
    fontSize: 12,
    lineHeight: "16px",
    fontWeight: 500,
    color: color.muted,
    paddingBottom: 8,
    borderBottom: `1px solid ${color.rule}`,
  };
  const cell = { padding: "10px 0", borderBottom: `1px solid ${color.ruleSoft}`, verticalAlign: "middle" as const };
  return (
    <table {...tableAttrs} width="100%" style={{ marginTop: top, borderCollapse: "collapse", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td style={header}>Site</td>
          <td width="72" align="right" style={{ ...header, width: 72, textAlign: "right" }}>
            Visitors
          </td>
          <td width="72" align="right" style={{ ...header, width: 72, textAlign: "right" }}>
            Change
          </td>
          <td className="ledger-bar" width="96" align="right" style={{ ...header, width: 96, textAlign: "right" }}>
            Last 7 days
          </td>
        </tr>
        {sites.map(site => (
          <tr key={site.siteId}>
            <td style={{ ...cell, fontSize: 14, lineHeight: "20px", color: color.text, wordBreak: "break-all" }}>
              {site.siteDomain}
            </td>
            <td
              align="right"
              style={{
                ...cell,
                textAlign: "right",
                fontSize: 14,
                lineHeight: "20px",
                fontWeight: 500,
                color: color.text,
              }}
            >
              {formatCount(site.users)}
            </td>
            <td
              align="right"
              style={{ ...cell, textAlign: "right", fontSize: 13, lineHeight: "20px", fontWeight: 500 }}
            >
              <ChangeCell site={site} />
            </td>
            <td className="ledger-bar" align="right" style={{ ...cell, textAlign: "right" }}>
              {isQuiet(site) ? <NoDataPill /> : <Sparkline daily={site.daily} />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const byOrganization = (sites: DigestSite[]) => {
  const groups = new Map<string, { id: string; name: string; sites: DigestSite[] }>();
  for (const site of sites) {
    const group = groups.get(site.organizationId) ?? {
      id: site.organizationId,
      name: site.organizationName,
      sites: [],
    };
    group.sites.push(site);
    groups.set(site.organizationId, group);
  }
  return [...groups.values()];
};

const lastPageview = (site: DigestSite) =>
  `No pageviews since ${formatDateTime(DateTime.fromISO(site.lastPageviewAt!, { zone: "utc" }))}`;

const QuietSites = ({ sites }: { sites: DigestSite[] }) => {
  if (sites.length === 0) return null;
  if (sites.length === 1) {
    const [site] = sites;
    return (
      <>
        <H2>{site.siteDomain} isn't sending data</H2>
        <P top={8}>{lastPageview(site)}. If the site is still up, check that the tracking script is still installed.</P>
        <P>
          <TextLink href={`${appUrl()}/${site.siteId}`}>Check {site.siteDomain}</TextLink>
        </P>
      </>
    );
  }
  return (
    <>
      <H2>{sites.length} sites aren't sending data</H2>
      <Rows
        top={16}
        rows={sites.slice(0, MAX_QUIET_ROWS).map(site => ({
          label: site.siteDomain,
          value: <TextLink href={`${appUrl()}/${site.siteId}`}>{lastPageview(site)}</TextLink>,
        }))}
      />
      {sites.length > MAX_QUIET_ROWS && (
        <Note top={12}>Plus {plural(sites.length - MAX_QUIET_ROWS, "more site")}.</Note>
      )}
      <P top={16}>If they're still up, check that the tracking script is still installed.</P>
    </>
  );
};

export const WeeklyDigestEmail = ({ digest, unsubscribeUrl }: WeeklyDigestEmailProps) => {
  const { users, previousUsers } = totals(digest.sites);
  const words = changeWords(percentChange(users, previousUsers));
  const org = soleOrganization(digest.sites);
  const shown = digest.sites.slice(0, MAX_ROWS);
  const hidden = digest.sites.slice(MAX_ROWS);
  const groups = byOrganization(shown);

  return (
    <LedgerLayout
      preview={weeklyDigestPreview(digest)}
      footer={[
        { label: "Turn off weekly reports", href: unsubscribeUrl },
        { label: "Account settings", href: `${appUrl()}/settings/account` },
      ]}
    >
      <H1>
        Your {digest.sites.length} sites had {visitorsPhrase(users)} last week
        {words === "flat" ? ", the same as the week before" : words ? `, ${words}` : ""}.
      </H1>
      <Note top={8}>
        {formatWeekRange(digest.weekStart, digest.weekEnd)}
        {org ? ` · ${org}` : ""}
      </Note>
      {groups.length === 1 ? (
        <SiteTable sites={groups[0].sites} top={28} />
      ) : (
        groups.map(group => (
          <React.Fragment key={group.id}>
            <H2 top={32}>{group.name}</H2>
            <SiteTable sites={group.sites} top={12} />
          </React.Fragment>
        ))
      )}
      {hidden.length > 0 && (
        <Note top={16}>
          Plus {plural(hidden.length, "more site")} with {visitorsPhrase(totals(hidden).users)}.
        </Note>
      )}
      <QuietSites sites={digest.sites.filter(isQuiet)} />
      <PrimaryButton top={40} label="Open Rybbit" href={appUrl()} />
    </LedgerLayout>
  );
};
