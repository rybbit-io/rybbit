"use client";

import { Filter } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useGetAiSources } from "../../../../../api/analytics/hooks/bots/useAiVisits";
import { AI_CHANNEL_FILTER } from "../../../../../api/analytics/hooks/bots/useBotFilters";
import { ErrorState } from "../../../../../components/ErrorState";
import { Favicon } from "../../../../../components/Favicon";
import { Delta } from "../../../../../components/site/Delta";
import { PivotActions } from "../../../../../components/site/PivotActions";
import { CardLoader } from "../../../../../components/ui/card";
import { usePivotHref } from "../../../../../hooks/usePivotHref";
import { percentDelta } from "../../../../../lib/delta";
import { StandardSkeleton } from "../../../components/shared/StandardSection/Skeleton";
import { TabbedSectionCard, type TabbedSectionItem } from "../../../components/shared/TabbedSectionCard";
import { useAiSignups } from "../../useAiSignups";
import { BarRow, Figure, ListBody, ListCaption, ListEmpty, ListFooter, ListHeader } from "./AiListParts";

type Tab = "sources" | "landing_pages";
type Parameter = "referrer" | "entry_page";

const SESSIONS = "w-14";
const CHANGE = "w-16";

const rowFilters = (parameter: Parameter, value: string): Filter[] => [
  AI_CHANNEL_FILTER,
  { parameter, type: "equals", value: [value] },
];

/**
 * The sessions AI products sent, by where they came from or where they began.
 * These are people in the site's analytics, not bots, read through the same
 * metric endpoint the main dashboard uses with the AI channel as a filter.
 */
function AiSourcesList({ parameter, inDialog = false }: { parameter: Parameter; inDialog?: boolean }) {
  const t = useExtracted();
  const pivotHref = usePivotHref();
  const { data, isLoading, isFetching, error, refetch } = useGetAiSources({ parameter });
  const { data: previousData } = useGetAiSources({ parameter, periodTime: "previous" });
  const signups = useAiSignups({ enabled: !inDialog });

  const rows = data?.data ?? [];
  const max = rows.reduce((largest, row) => Math.max(largest, Number(row.count ?? 0)), 0);
  const previous = previousData ? new Map(previousData.data.map(row => [row.value, Number(row.count ?? 0)])) : null;
  const isReferrer = parameter === "referrer";

  return (
    <div className={inDialog ? "flex min-h-0 flex-1 flex-col" : undefined}>
      {isFetching && !isLoading && (
        <div className="absolute left-0 top-[-8px] h-full w-full">
          <CardLoader />
        </div>
      )}
      <ListCaption>
        {isReferrer
          ? t("Sessions that arrived from an AI product. These are people, counted in your analytics.")
          : t("The pages where sessions from AI products began.")}
      </ListCaption>
      <ListHeader label={isReferrer ? t("Source") : t("Landing page")}>
        <Figure className={SESSIONS}>{t("Sessions")}</Figure>
        <Figure className={CHANGE}>{t("Change")}</Figure>
      </ListHeader>
      <ListBody inDialog={inDialog}>
        {isLoading ? (
          <StandardSkeleton />
        ) : error && !data ? (
          <ErrorState title={t("Failed to load data")} message={error.message} refetch={refetch} />
        ) : rows.length === 0 ? (
          <ListEmpty>{t("No AI product sent a visit in this period.")}</ListEmpty>
        ) : (
          rows.map(row => {
            const sessions = Number(row.count ?? 0);
            return (
              <BarRow
                key={row.value || "none"}
                fraction={max ? sessions / max : 0}
                label={
                  row.value ? (
                    <>
                      {isReferrer && <Favicon domain={row.value} className="h-3.5 w-3.5 shrink-0" />}
                      <Link
                        href={pivotHref("sessions", rowFilters(parameter, row.value))}
                        prefetch={false}
                        title={t("View these sessions")}
                        className="truncate underline-offset-4 hover:underline"
                      >
                        {row.value}
                      </Link>
                    </>
                  ) : (
                    // The channel came from a tagged link, not a referrer.
                    <span className="truncate">{isReferrer ? t("No referrer") : t("Other")}</span>
                  )
                }
                figures={
                  <>
                    <Figure className={`${SESSIONS} font-medium`}>{sessions.toLocaleString()}</Figure>
                    <Figure className={CHANGE}>
                      <Delta value={previous ? percentDelta(sessions, previous.get(row.value) ?? 0) : null} />
                    </Figure>
                  </>
                }
              />
            );
          })
        )}
      </ListBody>
      {!inDialog && (
        <ListFooter>
          <span className="tabular-nums">
            {signups && (
              <span title={t('Conversions of the goal "{goal}"', { goal: signups.goalName })}>
                {t("{count, plural, one {# signup} other {# signups}}, {rate} against {siteRate} site-wide", {
                  count: signups.signups,
                  rate: `${signups.rate.toFixed(1)}%`,
                  siteRate: `${signups.siteRate.toFixed(2)}%`,
                })}
              </span>
            )}
          </span>
          {rows.length > 0 && <PivotActions filters={[AI_CHANNEL_FILTER]} actions={["sessions", "segment"]} />}
        </ListFooter>
      )}
    </div>
  );
}

/** Who sent people back, and where those visits started. */
export function AiSources() {
  const t = useExtracted();

  const tabs: TabbedSectionItem<Tab>[] = [
    {
      value: "sources",
      label: t("Visits sent back"),
      dialogTitle: t("Visits sent back"),
      content: <AiSourcesList parameter="referrer" />,
      dialogContent: <AiSourcesList parameter="referrer" inDialog />,
    },
    {
      value: "landing_pages",
      label: t("Landing pages"),
      dialogTitle: t("Landing pages of AI visits"),
      content: <AiSourcesList parameter="entry_page" />,
      dialogContent: <AiSourcesList parameter="entry_page" inDialog />,
    },
  ];

  return <TabbedSectionCard defaultValue="sources" tabs={tabs} className="h-auto" />;
}
