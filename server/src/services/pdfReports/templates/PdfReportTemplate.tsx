import * as React from "react";
import type { PdfReportData } from "../pdfReportTypes.js";
import {
  MetricCard,
  TopListSection,
  SessionsChart,
  Page,
  TwoColumnRow,
  calculateGrowth,
  formatDuration,
  formatNumber,
  safeToFixed,
  getCountryFlagUrl,
  getCountryName,
  formatDateRange,
} from "./components/index.js";

interface PdfReportTemplateProps {
  reportData: PdfReportData;
}

export const PdfReportTemplate = ({ reportData }: PdfReportTemplateProps): React.ReactElement => {
  const {
    siteName,
    siteDomain,
    startDate,
    endDate,
    timeZone,
    generatedAt,
    overview,
    previousOverview,
    chartData,
    topCountries,
    topRegions,
    topCities,
    topPages,
    topReferrers,
    deviceBreakdown,
    topBrowsers,
    topOperatingSystems,
  } = reportData;

  const metrics = [
    {
      label: "Sessions",
      current: overview.sessions,
      previous: previousOverview?.sessions,
      format: formatNumber,
    },
    {
      label: "Pageviews",
      current: overview.pageviews,
      previous: previousOverview?.pageviews,
      format: formatNumber,
    },
    {
      label: "Unique Users",
      current: overview.users,
      previous: previousOverview?.users,
      format: formatNumber,
    },
    {
      label: "Avg Duration",
      current: overview.session_duration,
      previous: previousOverview?.session_duration,
      format: formatDuration,
    },
    {
      label: "Pages/Session",
      current: overview.pages_per_session,
      previous: previousOverview?.pages_per_session,
      format: (v: number | null) => safeToFixed(v, 1),
    },
    {
      label: "Bounce Rate",
      current: overview.bounce_rate,
      previous: previousOverview?.bounce_rate,
      format: (v: number | null) => `${safeToFixed(v, 1)}%`,
      invertGrowth: true,
    },
  ];

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            line-height: 1.5;
          }
          @page {
            size: A4;
            margin: 0;
          }
          .page {
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .page-last {
            page-break-after: auto;
          }
        `,
          }}
        />
      </head>
      <body>
        {/* Page 1: Header + Overview */}
        <Page>
          {/* Header */}
          <div style={{ marginBottom: "32px", borderBottom: "2px solid #10b981", paddingBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <img
                src={`https://www.google.com/s2/favicons?domain=${siteDomain}&sz=32`}
                alt=""
                width="28"
                height="28"
                style={{ borderRadius: "4px" }}
              />
              <h1 style={{ fontSize: "28px", fontWeight: "600", color: "#111827" }}>{siteName}</h1>
            </div>
            <div style={{ color: "#6b7280", fontSize: "14px" }}>
              <div style={{ marginBottom: "4px" }}>{formatDateRange(startDate, endDate, timeZone)}</div>
              <div>Generated on {generatedAt}</div>
            </div>
          </div>

          {/* Overview Metrics - 3 per row */}
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#111827" }}>Overview</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {metrics.map((metric, index) => {
                const growth = calculateGrowth(metric.current, metric.previous);
                const isPositive = metric.invertGrowth ? !growth.isPositive : growth.isPositive;
                return (
                  <div key={index} style={{ width: "calc(33.333% - 8px)", minWidth: "180px" }}>
                    <MetricCard
                      label={metric.label}
                      currentValue={metric.format(metric.current as number)}
                      growth={growth.value}
                      isPositive={isPositive}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sessions Chart */}
          <SessionsChart data={chartData} startDate={startDate} endDate={endDate} timeZone={timeZone} />

          {/* Footer for page 1 */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "16px",
              borderTop: "1px solid #e5e7eb",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "12px",
            }}
          >
            <div>Powered by Rybbit</div>
            <div style={{ marginTop: "4px" }}>https://rybbit.com</div>
          </div>
        </Page>

        <Page>
          <TwoColumnRow
            left={
              <TopListSection
                title="Top Countries"
                items={topCountries}
                renderLabel={item => getCountryName(item.value)}
                getIconUrl={item => getCountryFlagUrl(item.value)}
                iconSize={{ width: 20, height: 15 }}
              />
            }
            right={<TopListSection title="Top Regions" items={topRegions} renderLabel={item => item.value} />}
          />
          <TwoColumnRow
            left={<TopListSection title="Top Cities" items={topCities} renderLabel={item => item.value} />}
            right={<TopListSection title="Top Pages" items={topPages} renderLabel={item => item.value} />}
          />
        </Page>

        <Page>
          <TwoColumnRow
            left={
              <TopListSection
                title="Top Referrers"
                items={topReferrers}
                renderLabel={item => item.value}
                showFavicon={true}
              />
            }
            right={
              <TopListSection
                title="Devices"
                items={deviceBreakdown}
                renderLabel={item => item.value.charAt(0).toUpperCase() + item.value.slice(1)}
              />
            }
          />
          <TwoColumnRow
            left={<TopListSection title="Browsers" items={topBrowsers} renderLabel={item => item.value} />}
            right={
              <TopListSection title="Operating Systems" items={topOperatingSystems} renderLabel={item => item.value} />
            }
          />
        </Page>
      </body>
    </html>
  );
};
