import { DateTime } from "luxon";
import * as React from "react";
import type { DailySessions, MetricData, SiteReport } from "../../../services/weekyReports/weeklyReportTypes.js";
import { appUrl, formatChange, formatCount, formatDuration, percentChange, truncate } from "../format.js";
import {
  color,
  H1,
  H2,
  LedgerLayout,
  Note,
  PrimaryButton,
  ShareTable,
  StatGrid,
  tableAttrs,
  type Stat,
} from "./ledger.js";

interface WeeklyReportEmailProps {
  site: SiteReport;
  unsubscribeUrl: string;
}

const CHART_HEIGHT = 112;
const ROWS_PER_TABLE = 5;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const countryName = (code: string) => {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const day = (iso: string) => DateTime.fromISO(iso, { zone: "utc" });

/** "Oct 13–19", or "Sep 29–Oct 5" across a month boundary. */
export const formatWeekRange = (startIso: string, endIso: string) => {
  const start = day(startIso);
  const end = day(endIso);
  return start.month === end.month
    ? `${start.toFormat("LLL d")}–${end.toFormat("d")}`
    : `${start.toFormat("LLL d")}–${end.toFormat("LLL d")}`;
};

const previousRange = (site: SiteReport) =>
  formatWeekRange(
    day(site.weekStart).minus({ days: 7 }).toISODate()!,
    day(site.weekEnd).minus({ days: 7 }).toISODate()!
  );

const visitorChange = (site: SiteReport) => percentChange(site.currentWeek.users, site.previousWeek.users);

/** "up 9.8%", "down 3.1%", "flat", or null when last week had no visitors. */
const changeWords = (change: number | null) => {
  if (change === null) return null;
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return "flat";
  return `${rounded > 0 ? "up" : "down"} ${Math.abs(rounded).toFixed(1)}%`;
};

const visitorsPhrase = (n: number) => `${formatCount(n)} ${n === 1 ? "visitor" : "visitors"}`;

export const weeklyReportSubject = (site: SiteReport) => {
  const words = changeWords(visitorChange(site));
  return `${site.siteDomain}: ${visitorsPhrase(site.currentWeek.users)} last week${words && words !== "flat" ? `, ${words}` : ""}`;
};

const busiestDay = (daily: DailySessions[]) =>
  daily.reduce<DailySessions | null>((best, d) => (d.sessions > (best?.sessions ?? 0) ? d : best), null);

export const weeklyReportPreview = (site: SiteReport) => {
  const busiest = busiestDay(site.daily);
  return [
    busiest && `Busiest day ${day(busiest.date).toFormat("cccc")}, ${formatCount(busiest.sessions)} sessions`,
    site.topReferrers[0] && `Top source ${site.topReferrers[0].value}`,
    formatWeekRange(site.weekStart, site.weekEnd),
  ]
    .filter(Boolean)
    .join(" · ");
};

/** "+9.8% from 5,560"; green when the move is good for the site, red when it isn't. */
const Change = ({
  current,
  previous,
  format,
  lowerIsBetter = false,
  points = false,
}: {
  current: number | null;
  previous: number | null;
  format: (n: number) => string;
  lowerIsBetter?: boolean;
  points?: boolean;
}) => {
  const prev = previous ?? 0;
  const curr = current ?? 0;
  const change = points ? (prev > 0 ? curr - prev : null) : percentChange(curr, prev);
  if (change === null) return <>from {format(prev)}</>;
  const rounded = Math.round(change * 10) / 10;
  const good = lowerIsBetter ? rounded < 0 : rounded > 0;
  const label = points
    ? rounded === 0
      ? "0 pp"
      : `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)} pp`
    : formatChange(change);
  return (
    <>
      <span style={{ fontWeight: 500, color: rounded === 0 ? color.muted : good ? color.up : color.down }}>
        {label}
      </span>{" "}
      from {format(prev)}
    </>
  );
};

const percent = (n: number | null) => `${(n ?? 0).toFixed(1)}%`;
const oneDecimal = (n: number | null) => (n ?? 0).toFixed(1);

const stats = (site: SiteReport): Stat[] => {
  const { currentWeek: c, previousWeek: p } = site;
  return [
    {
      label: "Visitors",
      value: formatCount(c.users),
      change: <Change current={c.users} previous={p.users} format={formatCount} />,
    },
    {
      label: "Sessions",
      value: formatCount(c.sessions),
      change: <Change current={c.sessions} previous={p.sessions} format={formatCount} />,
    },
    {
      label: "Pageviews",
      value: formatCount(c.pageviews),
      change: <Change current={c.pageviews} previous={p.pageviews} format={formatCount} />,
    },
    {
      label: "Pages per session",
      value: oneDecimal(c.pages_per_session),
      change: <Change current={c.pages_per_session} previous={p.pages_per_session} format={oneDecimal} />,
    },
    {
      label: "Avg. session",
      value: formatDuration(c.session_duration),
      change: <Change current={c.session_duration} previous={p.session_duration} format={formatDuration} />,
    },
    {
      label: "Bounce rate",
      value: percent(c.bounce_rate),
      change: <Change current={c.bounce_rate} previous={p.bounce_rate} format={percent} lowerIsBetter points />,
    },
  ];
};

const LegendSwatch = ({ fill, outline }: { fill: string; outline?: string }) => (
  <span
    style={{
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: 2,
      backgroundColor: fill,
      border: outline ? `1px solid ${outline}` : undefined,
      boxSizing: "border-box",
      verticalAlign: "-1px",
      marginRight: 6,
    }}
  />
);

/** A solid bar drawn as a table cell, which Outlook sizes where it ignores div heights. */
const Bar = ({ width, height, fill }: { width: number; height: number; fill: string }) => (
  <table {...tableAttrs} width={width} style={{ width }}>
    <tbody>
      <tr>
        <td
          height={height}
          style={{ height, width, backgroundColor: fill, borderRadius: "2px 2px 0 0", fontSize: 0, lineHeight: "0px" }}
        >
          &nbsp;
        </td>
      </tr>
    </tbody>
  </table>
);

const DailyChart = ({ site }: { site: SiteReport }) => {
  const max = Math.max(1, ...site.daily.flatMap(d => [d.sessions, d.previousSessions]));
  const busiest = busiestDay(site.daily);
  const scale = (n: number) => (n > 0 ? Math.max(2, Math.round((n / max) * CHART_HEIGHT)) : 0);
  const label = (d: DailySessions) => ({
    fontSize: 11,
    lineHeight: "14px",
    fontWeight: d === busiest ? 600 : 400,
    color: d === busiest ? color.text : color.muted,
  });

  return (
    <>
      <table {...tableAttrs} width="100%" style={{ marginTop: 40 }}>
        <tbody>
          <tr>
            <td>
              <H2 top={0}>Sessions by day</H2>
            </td>
            <td align="right" style={{ fontSize: 12, lineHeight: "16px", color: color.muted, whiteSpace: "nowrap" }}>
              <LegendSwatch fill={color.data} />
              {formatWeekRange(site.weekStart, site.weekEnd)}
              <span style={{ paddingLeft: 16 }} />
              <LegendSwatch fill={color.previous} />
              {previousRange(site)}
            </td>
          </tr>
        </tbody>
      </table>
      <table {...tableAttrs} width="100%" style={{ marginTop: 16, tableLayout: "fixed" }}>
        <tbody>
          <tr>
            {site.daily.map(d => (
              <td key={d.date} align="center" style={label(d)}>
                {formatCount(d.sessions)}
              </td>
            ))}
          </tr>
          <tr>
            {site.daily.map(d => (
              <td
                key={d.date}
                align="center"
                valign="bottom"
                height={CHART_HEIGHT + 6}
                style={{
                  height: CHART_HEIGHT + 6,
                  verticalAlign: "bottom",
                  borderBottom: `1px solid ${color.axis}`,
                }}
              >
                <table {...tableAttrs} align="center">
                  <tbody>
                    <tr>
                      <td valign="bottom" style={{ verticalAlign: "bottom", paddingRight: 3 }}>
                        {scale(d.previousSessions) > 0 && (
                          <Bar width={12} height={scale(d.previousSessions)} fill={color.previous} />
                        )}
                      </td>
                      <td valign="bottom" style={{ verticalAlign: "bottom" }}>
                        {scale(d.sessions) > 0 && <Bar width={24} height={scale(d.sessions)} fill={color.data} />}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            ))}
          </tr>
          <tr>
            {site.daily.map(d => (
              <td key={d.date} align="center" style={{ ...label(d), paddingTop: 8 }}>
                {day(d.date).toFormat("ccc d")}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
};

const Breakdown = ({
  title,
  labelHeader,
  items,
  labelFor,
}: {
  title: string;
  labelHeader: string;
  items: MetricData[];
  labelFor: (item: MetricData) => string;
}) => {
  if (items.length === 0) return null;
  const rows = items.slice(0, ROWS_PER_TABLE);
  const largest = rows[0]?.count || 1;
  return (
    <>
      <H2>{title}</H2>
      <ShareTable
        labelHeader={labelHeader}
        valueHeader="Sessions"
        rows={rows.map(item => ({
          label: labelFor(item),
          value: formatCount(item.count),
          share: item.percentage,
          bar: (item.count / largest) * 100,
        }))}
      />
    </>
  );
};

const DEVICE_FILLS = [color.data, color.dataMid, color.dataLight];

const Devices = ({ items }: { items: MetricData[] }) => {
  const devices = items.filter(item => (item.percentage ?? 0) > 0).slice(0, 3);
  if (devices.length === 0) return null;
  const total = devices.reduce((sum, d) => sum + (d.percentage ?? 0), 0);
  return (
    <>
      <H2>Devices</H2>
      <table {...tableAttrs} width="100%" style={{ marginTop: 14, borderCollapse: "separate" }}>
        <tbody>
          <tr>
            {devices.map((d, i) => (
              <td
                key={d.value}
                width={`${Math.max(1, Math.round(((d.percentage ?? 0) / total) * 100))}%`}
                style={{
                  height: 10,
                  lineHeight: "10px",
                  fontSize: 0,
                  backgroundColor: DEVICE_FILLS[i],
                  borderLeft: i > 0 ? `2px solid ${color.page}` : undefined,
                }}
              >
                &nbsp;
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: "20px", color: color.body }}>
        {devices.map((d, i) => (
          <span key={d.value} style={{ paddingRight: 24, whiteSpace: "nowrap" }}>
            <LegendSwatch fill={DEVICE_FILLS[i]} outline={i === 2 ? color.dataMid : undefined} />
            {capitalize(d.value)} <span style={{ fontWeight: 600 }}>{(d.percentage ?? 0).toFixed(1)}%</span>
          </span>
        ))}
      </p>
    </>
  );
};

export const WeeklyReportEmail = ({ site, unsubscribeUrl }: WeeklyReportEmailProps) => {
  const words = changeWords(visitorChange(site));
  return (
    <LedgerLayout
      preview={weeklyReportPreview(site)}
      footer={[
        { label: "Turn off weekly reports", href: unsubscribeUrl },
        { label: "Account settings", href: `${appUrl()}/settings/account` },
      ]}
    >
      <H1>
        {site.siteDomain} had {visitorsPhrase(site.currentWeek.users)} last week
        {words === "flat" ? ", the same as the week before" : words ? `, ${words}` : ""}.
      </H1>
      <Note top={8}>
        {formatWeekRange(site.weekStart, site.weekEnd)}, compared with {previousRange(site)}
      </Note>
      <StatGrid stats={stats(site)} />
      {site.daily.length > 0 && <DailyChart site={site} />}
      <Breakdown title="Top pages" labelHeader="Page" items={site.topPages} labelFor={item => truncate(item.value)} />
      <Breakdown
        title="Top sources"
        labelHeader="Referrer"
        items={site.topReferrers}
        labelFor={item => truncate(item.value)}
      />
      <Breakdown
        title="Countries"
        labelHeader="Country"
        items={site.topCountries}
        labelFor={item => countryName(item.value)}
      />
      <Devices items={site.deviceBreakdown} />
      <PrimaryButton top={40} label={`Open ${site.siteDomain} in Rybbit`} href={`${appUrl()}/${site.siteId}`} />
    </LedgerLayout>
  );
};
