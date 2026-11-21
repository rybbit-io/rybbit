import { FilterParams } from "@rybbit/shared";
import { matchesUser } from "../utils/effectiveUserId.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { getTimeStatement } from "../utils/timeWindow.js";

/**
 * The slice of `events` every user-profile panel reads: one user's events on
 * one site, inside the selected window, in the sessions the page's filters
 * select. Built in one place so the stat band, the goals card and the insight
 * row cannot disagree with the profile summary about which sessions count.
 *
 * Queries built from it bind `{userId:String}` and `{site:Int32}`.
 */
export const buildUserEventScope = (
  query: Pick<FilterParams, "filters"> & Parameters<typeof getTimeStatement>[0],
  siteId: number
) => {
  // Optional time range + dimension filters; both empty when the page is on
  // all-time with no filters, which keeps the original full-history behavior.
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);
  const filteredSessionsJoin = filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : "";
  const withFilteredSessions = filteredSessionsCTE ? `WITH ${filteredSessionsCTE}` : "";

  // Filters select sessions first. Every panel then reads all events in those
  // sessions, keeping the summary, vitals, locations, devices, and session list
  // on the same session-scoped semantics.
  const scopedEvents = `(
        SELECT source_events.*
        FROM events AS source_events
        ${filteredSessionsJoin}
        WHERE
            ${matchesUser("{userId:String}", "source_events")}
            AND source_events.site_id = {site:Int32}
            ${timeStatement}
    ) AS events`;

  return { timeStatement, filteredSessionsCTE, withFilteredSessions, scopedEvents };
};
