import type { Filter } from "@rybbit/shared";
import type { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import type {
  GeoBreakdownResponse,
  GeoBreakdownRow,
  GeoBreakdownTotals,
  GeoLevel,
} from "../../../../api/analytics/hooks/useGetGeoBreakdown";
import { DeltaValue, percentChange, percentDelta, pointDelta } from "../../../../lib/delta";
import type { GlobeMetric } from "../globeStore";

/** A place as the list, the map and the card show it: its figure for the chosen metric, in context. */
export interface PlaceEntry {
  /** The value the matching filter takes; unique within a level. */
  key: string;
  /** 1-based position in the list. */
  rank: number;
  row: GeoBreakdownRow;
  /** The chosen metric's figure. Bounce rate is 0-100. */
  value: number;
  /** Share of the total in percent. For bounce rate, the share of sessions. */
  share: number | null;
  /** The figure in the comparison period; null when there is nothing to compare with. */
  previous: number | null;
  delta: DeltaValue | null;
}

export const isRateMetric = (metric: GlobeMetric) => metric === "bounce_rate";

export const metricValue = (row: GeoBreakdownRow, metric: GlobeMetric): number =>
  metric === "bounce_rate" ? row.bounce_rate : row[metric];

/**
 * A city value is "<region>-<city>", where the region is itself "<country>-<code>":
 * "US-CA-San Francisco". Sessions without a region give "-<city>".
 */
export function parseCityKey(key: string): { country: string; region: string; city: string } {
  if (key.startsWith("-")) return { country: "", region: "", city: key.slice(1) };
  const parts = key.split("-");
  if (parts.length < 3) return { country: parts[0] ?? "", region: "", city: parts.slice(1).join("-") };
  return { country: parts[0], region: `${parts[0]}-${parts[1]}`, city: parts.slice(2).join("-") };
}

/** The two-letter country a place belongs to, for its flag. Empty when unknown. */
export function placeCountryCode(level: GeoLevel, key: string): string {
  if (level === "country") return key;
  if (level === "region") return key.split("-")[0] ?? "";
  return parseCityKey(key).country;
}

/** The filter that narrows the dashboard, or a pivot, to one place. */
export const placeFilter = (level: GeoLevel, key: string): Filter => ({
  parameter: level,
  type: "equals",
  value: [key],
});

const sessionPlaceKey = (session: GetSessionsResponse[number], level: GeoLevel): string => {
  if (level === "country") return session.country ?? "";
  if (level === "region") return session.region ?? "";
  return session.city ? `${session.region ?? ""}-${session.city}` : "";
};

const bounceRate = (bounces: number, sessions: number) =>
  sessions > 0 ? Math.round((bounces * 10000) / sessions) / 100 : null;

/**
 * The same breakdown the server returns, computed from a list of sessions: what
 * the map shows for one replay window, where the sessions are already loaded.
 */
export function aggregateSessions(sessions: GetSessionsResponse, level: GeoLevel): GeoBreakdownResponse {
  const groups = new Map<
    string,
    { sessions: number; pageviews: number; bounces: number; users: Set<string>; lat?: number; lon?: number }
  >();
  const allUsers = new Set<string>();
  let total = 0;
  let pageviews = 0;
  let bounces = 0;

  for (const session of sessions) {
    const key = sessionPlaceKey(session, level);
    if (!key) continue;

    const user = session.identified_user_id || session.user_id;
    const views = session.pageviews ?? 0;
    let group = groups.get(key);
    if (!group) {
      group = { sessions: 0, pageviews: 0, bounces: 0, users: new Set(), lat: session.lat, lon: session.lon };
      groups.set(key, group);
    }
    group.sessions += 1;
    group.pageviews += views;
    group.users.add(user);
    if (views === 1) group.bounces += 1;

    allUsers.add(user);
    total += 1;
    pageviews += views;
    if (views === 1) bounces += 1;
  }

  const rows: GeoBreakdownRow[] = [...groups.entries()]
    .map(([value, group]) => ({
      value,
      sessions: group.sessions,
      users: group.users.size,
      pageviews: group.pageviews,
      bounce_rate: bounceRate(group.bounces, group.sessions) ?? 0,
      ...(level === "city" ? { lat: group.lat, lon: group.lon } : {}),
    }))
    .sort((a, b) => b.sessions - a.sessions || a.value.localeCompare(b.value));

  return {
    rows,
    totals: {
      sessions: total,
      users: allUsers.size,
      pageviews,
      bounce_rate: bounceRate(bounces, total),
      places: groups.size,
    },
  };
}

const totalFor = (totals: GeoBreakdownTotals, metric: GlobeMetric): number =>
  metric === "bounce_rate" ? totals.sessions : totals[metric];

/**
 * Ranks the places by the chosen metric and sets each against the total and the
 * comparison period.
 *
 * Bounce rate keeps the order by sessions: sorted by rate, the top of the list
 * would be single-session places at 100%.
 */
export function buildPlaceEntries(
  current: GeoBreakdownResponse | undefined,
  previous: GeoBreakdownResponse | undefined,
  metric: GlobeMetric
): PlaceEntry[] {
  if (!current) return [];

  const rate = isRateMetric(metric);
  const total = totalFor(current.totals, metric);
  const previousByKey = new Map(previous?.rows.map(row => [String(row.value), row]));
  // A place missing from a complete comparison list had nothing there; one
  // missing from a list the row limit cut short is simply unknown.
  const previousIsComplete = !!previous && previous.totals.places <= previous.rows.length;

  const sorted = rate
    ? [...current.rows].sort((a, b) => b.sessions - a.sessions)
    : [...current.rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || b.sessions - a.sessions);

  return sorted.map((row, index) => {
    const key = String(row.value);
    const value = metricValue(row, metric);
    const previousRow = previousByKey.get(key);
    const previousValue = previousRow ? metricValue(previousRow, metric) : previousIsComplete && !rate ? 0 : null;

    return {
      key,
      rank: index + 1,
      row,
      value,
      share: total > 0 ? ((rate ? row.sessions : value) / total) * 100 : null,
      previous: previousValue,
      delta: !previous ? null : rate ? pointDelta(value, previousValue) : percentDelta(value, previousValue),
    };
  });
}

/** Change of a small whole number (how many countries), where a percentage would overstate it. */
export function countDelta(current: number | null | undefined, previous: number | null | undefined): DeltaValue | null {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  const change = current - previous;
  const magnitude = Math.abs(change).toLocaleString();
  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    text: magnitude,
    signed: `${change > 0 ? "+" : change < 0 ? "-" : ""}${magnitude}`,
  };
}

export interface CountryStats {
  countries: number;
  previousCountries: number | null;
  top: { key: string; share: number; previousShare: number | null } | null;
  topFive: { keys: string[]; share: number; previousShare: number | null } | null;
  fastest: { key: string; sessions: number; previousSessions: number; share: number } | null;
}

// A country has to carry this much of the traffic before its growth is worth
// naming: three sessions becoming nine is not the fastest-growing market.
const FASTEST_MIN_SESSIONS = 10;
const FASTEST_MIN_SHARE = 0.005;

/**
 * The stat band's figures: how concentrated the traffic is, and where it grew
 * most. Shares are of sessions that have a country. The comparison figures are
 * for the same countries, so "top 5 share" is not compared with a different five.
 */
export function countryStats(
  current: GeoBreakdownResponse | undefined,
  previous: GeoBreakdownResponse | undefined
): CountryStats | null {
  if (!current) return null;

  const total = current.totals.sessions;
  const rows = [...current.rows].sort((a, b) => b.sessions - a.sessions);
  const previousTotal = previous?.totals.sessions ?? 0;
  const previousSessions = new Map(previous?.rows.map(row => [String(row.value), row.sessions]));
  const previousShare = (keys: string[]) =>
    previous && previousTotal > 0
      ? (keys.reduce((sum, key) => sum + (previousSessions.get(key) ?? 0), 0) / previousTotal) * 100
      : null;

  const share = (sessions: number) => (total > 0 ? (sessions / total) * 100 : 0);
  const topRow = rows[0];
  const five = rows.slice(0, 5);
  const fiveKeys = five.map(row => String(row.value));

  const threshold = Math.max(FASTEST_MIN_SESSIONS, total * FASTEST_MIN_SHARE);
  let fastest: CountryStats["fastest"] = null;
  let fastestChange = 0;
  if (previous) {
    for (const row of rows) {
      const before = previousSessions.get(String(row.value)) ?? 0;
      // The floor applies to both periods: growth from one session to ten is as
      // much noise as from three to nine.
      if (row.sessions < threshold || before < FASTEST_MIN_SESSIONS) continue;
      const change = percentChange(row.sessions, before);
      if (change !== null && change > fastestChange) {
        fastestChange = change;
        fastest = {
          key: String(row.value),
          sessions: row.sessions,
          previousSessions: before,
          share: share(row.sessions),
        };
      }
    }
  }

  return {
    countries: current.totals.places,
    previousCountries: previous ? previous.totals.places : null,
    top: topRow
      ? {
          key: String(topRow.value),
          share: share(topRow.sessions),
          previousShare: previousShare([String(topRow.value)]),
        }
      : null,
    topFive:
      five.length > 1
        ? {
            keys: fiveKeys,
            share: share(five.reduce((sum, row) => sum + row.sessions, 0)),
            previousShare: previousShare(fiveKeys),
          }
        : null,
    fastest,
  };
}
