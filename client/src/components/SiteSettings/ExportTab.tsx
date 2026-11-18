"use client";

import { Download, Loader2 } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { eventExportUrl, EventExportFormat, EventExportParams } from "@/api/analytics/endpoints";
import { useGetEventExportCount } from "@/api/analytics/hooks/useGetEventExportCount";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BACKEND_URL } from "@/lib/const";
import { useTimezone } from "@/lib/store";

import { SettingRow, SettingsSection, SettingsSections } from "./SettingsSection";

type PresetKey =
  | "yesterday"
  | "last-7-days"
  | "last-30-days"
  | "last-90-days"
  | "last-12-months"
  | "this-year"
  | "last-year"
  | "all-time";
type RangeKey = PresetKey | "custom";

// Short presets first: a busy site can pass the per-file cap within a month.
const RANGE_KEYS: RangeKey[] = [
  "yesterday",
  "last-7-days",
  "last-30-days",
  "last-90-days",
  "last-12-months",
  "this-year",
  "last-year",
  "all-time",
  "custom",
];

const iso = (date: DateTime) => date.toFormat("yyyy-MM-dd");
const today = (timeZone: string) => DateTime.now().setZone(timeZone).startOf("day");

function presetDates(range: PresetKey, timeZone: string): Pick<EventExportParams, "startDate" | "endDate"> {
  const now = today(timeZone);
  switch (range) {
    case "yesterday": {
      const yesterday = iso(now.minus({ days: 1 }));
      return { startDate: yesterday, endDate: yesterday };
    }
    case "last-7-days":
      return { startDate: iso(now.minus({ days: 6 })), endDate: iso(now) };
    case "last-30-days":
      return { startDate: iso(now.minus({ days: 29 })), endDate: iso(now) };
    case "last-90-days":
      return { startDate: iso(now.minus({ days: 89 })), endDate: iso(now) };
    case "last-12-months":
      return { startDate: iso(now.minus({ months: 12 }).plus({ days: 1 })), endDate: iso(now) };
    case "this-year":
      return { startDate: iso(now.startOf("year")), endDate: iso(now) };
    case "last-year": {
      const lastYear = now.minus({ years: 1 });
      return { startDate: iso(lastYear.startOf("year")), endDate: iso(lastYear.endOf("year")) };
    }
    case "all-time":
      return { startDate: "", endDate: "" };
  }
}

export function ExportTab({ siteId }: { siteId: number }) {
  const t = useExtracted();
  const timeZone = useTimezone();
  const [range, setRange] = useState<RangeKey>("last-30-days");
  const [custom, setCustom] = useState(() => presetDates("last-7-days", timeZone));
  const [format, setFormat] = useState<EventExportFormat>("csv");

  const dates = range === "custom" ? custom : presetDates(range, timeZone);
  const validRange =
    range !== "custom" || (!!custom.startDate && !!custom.endDate && custom.startDate <= custom.endDate);
  const params: EventExportParams = { ...dates, timeZone };
  const { data: count, isLoading, error } = useGetEventExportCount(siteId, params, { enabled: validRange });
  const tooLarge = !!count && count.rows > count.maxRows;
  const canDownload = validRange && !!count && count.rows > 0 && !tooLarge;

  const rangeLabels: Record<RangeKey, string> = {
    yesterday: t("Yesterday"),
    "last-7-days": t("Last 7 days"),
    "last-30-days": t("Last 30 days"),
    "last-90-days": t("Last 90 days"),
    "last-12-months": t("Last 12 months"),
    "this-year": t("This year"),
    "last-year": t("Last year"),
    "all-time": t("All time"),
    custom: t("Custom range"),
  };

  const apiExample = `curl --fail "${BACKEND_URL}/sites/${siteId}/export/events?start_date=2026-01-01&end_date=2026-01-31&time_zone=UTC&format=csv" \\
  -H "Authorization: Bearer $RYBBIT_API_KEY" \\
  -o events-2026-01.csv`;

  return (
    <SettingsSections>
      <SettingsSection
        title={t("Export events")}
        description={t(
          "Download this site's raw events (pageviews, custom events, errors and web vitals) as a file. IP addresses are never included."
        )}
      >
        <SettingRow label={t("Date range")} description={t("Dates are in your selected timezone.")}>
          <Select value={range} onValueChange={value => setRange(value as RangeKey)}>
            <SelectTrigger className="w-[180px]" aria-label={t("Date range")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_KEYS.map(key => (
                <SelectItem key={key} value={key}>
                  {rangeLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        {range === "custom" && (
          <SettingRow label={t("From")} description={t("Both dates are included.")}>
            <Input
              type="date"
              aria-label={t("From")}
              className="w-[150px]"
              value={custom.startDate}
              max={iso(today(timeZone))}
              onChange={event => setCustom({ ...custom, startDate: event.target.value })}
            />
            <span className="text-sm text-muted-foreground">{t("to")}</span>
            <Input
              type="date"
              aria-label={t("To")}
              className="w-[150px]"
              value={custom.endDate}
              max={iso(today(timeZone))}
              onChange={event => setCustom({ ...custom, endDate: event.target.value })}
            />
          </SettingRow>
        )}
        <SettingRow
          label={t("Format")}
          description={t("CSV opens in spreadsheets. NDJSON is one JSON object per line, for scripts.")}
        >
          <Select value={format} onValueChange={value => setFormat(value as EventExportFormat)}>
            <SelectTrigger className="w-[180px]" aria-label={t("Format")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="ndjson">NDJSON</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <div className="flex items-center justify-between gap-6 rounded-md border border-neutral-150 px-4 py-3 dark:border-neutral-850">
          <p className="text-sm text-muted-foreground tabular-nums">
            {!validRange
              ? t("Pick a start date on or before the end date.")
              : isLoading
                ? t("Counting events…")
                : error
                  ? t("Couldn't count events for this range.")
                  : tooLarge
                    ? t("{rows} events is more than one file can hold ({max}). Pick a shorter range.", {
                        rows: count.rows.toLocaleString(),
                        max: count.maxRows.toLocaleString(),
                      })
                    : count?.rows === 0
                      ? t("No events in this range.")
                      : t("{rows} events", { rows: (count?.rows ?? 0).toLocaleString() })}
          </p>
          {canDownload ? (
            <Button asChild size="sm">
              <a href={eventExportUrl(siteId, params, format)} download>
                <Download className="h-4 w-4" />
                {t("Download")}
              </a>
            </Button>
          ) : (
            <Button size="sm" disabled>
              {validRange && isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("Download")}
            </Button>
          )}
        </div>
      </SettingsSection>
      <SettingsSection
        title={t("Export with the API")}
        description={
          <>
            {t(
              "Automate exports with an organization API key. Each request returns at most {max} events, so fetch long ranges month by month.",
              {
                max: (count?.maxRows ?? 2_000_000).toLocaleString(),
              }
            )}{" "}
            <a
              href="https://rybbit.com/docs/api/events/export"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t("API reference")}
            </a>
          </>
        }
      >
        <CodeSnippet language="bash" code={apiExample} />
      </SettingsSection>
    </SettingsSections>
  );
}
