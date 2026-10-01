"use client";

import { DateTime } from "luxon";
import { useExtracted } from "next-intl";

import { Favicon } from "@/components/Favicon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateTimeFormat } from "@/hooks/useDateTimeFormat";
import { getTimezone } from "@/lib/store";
import { truncateString, truncateUrl } from "@/lib/utils";
import { formatShare } from "../../utils/properties";

export interface AutocaptureRow {
  /** What the events are grouped by: a URL, a button's text, a form's name, the copied text. */
  value: string;
  count: number;
  /** UTC, as ClickHouse prints it. */
  lastSeen: string;
}

interface AutocaptureTableProps {
  rows: AutocaptureRow[];
  /** The largest count among every row, so bars keep their scale when the list is cut or searched. */
  maxCount: number;
  /** The total the shares are out of. */
  total: number;
  valueLabel: string;
  /** The values are URLs: draw them as links with a favicon. */
  links?: boolean;
}

const hostnameOf = (url: string): string | null => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

/** Autocaptured events of one type, grouped by what was clicked, submitted or copied. */
export function AutocaptureTable({ rows, maxCount, total, valueLabel, links = false }: AutocaptureTableProps) {
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
  const timezone = getTimezone();

  return (
    <div className="@container">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
            <TableHead className="rounded-none pl-4 first:rounded-none">{valueLabel}</TableHead>
            <TableHead className="w-[120px] @min-[480px]:w-[220px]">{t("Events")}</TableHead>
            <TableHead className="hidden w-[128px] rounded-none pr-4 last:rounded-none @min-[640px]:table-cell">
              {t("Last seen")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const share = total > 0 ? row.count / total : 0;
            const lastSeen = DateTime.fromSQL(row.lastSeen, { zone: "utc" }).setZone(timezone);
            const hostname = links ? hostnameOf(row.value) : null;

            return (
              <TableRow key={row.value} className="h-10">
                <TableCell className="pl-4">
                  {hostname ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Favicon domain={hostname} className="h-4 w-4 shrink-0" />
                      <a
                        href={row.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.value}
                        className="truncate font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        {truncateUrl(row.value)}
                      </a>
                    </div>
                  ) : (
                    <div className="truncate font-medium text-neutral-900 dark:text-neutral-100" title={row.value}>
                      {truncateString(row.value, 120)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-11 text-right font-medium tabular-nums">{row.count.toLocaleString()}</span>
                    <div className="relative hidden h-1.5 min-w-0 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800 @min-[480px]:block">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-dataviz"
                        style={{ width: `${maxCount > 0 ? (row.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-11 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {formatShare(share)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap pr-4 text-xs tabular-nums text-neutral-600 dark:text-neutral-300 @min-[640px]:table-cell">
                  {lastSeen.isValid ? formatRelative(lastSeen) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
