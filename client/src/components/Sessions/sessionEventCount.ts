import { GetSessionsResponse } from "../../api/analytics/endpoints";

type SessionEventCounts = Pick<
  GetSessionsResponse[number],
  "events" | "button_clicks" | "copies" | "form_submits" | "input_changes"
>;

/**
 * A session's "events" figure: custom events plus the autocaptured
 * interactions. The sessions list filters and sorts on the same sum
 * (SESSION_EVENT_TOTAL on the server), so the number on a row is the number
 * the events range compares. Outbound clicks and errors are counted apart.
 */
export function sessionEventCount(session: SessionEventCounts): number {
  return (
    session.events +
    (session.button_clicks || 0) +
    (session.copies || 0) +
    (session.form_submits || 0) +
    (session.input_changes || 0)
  );
}
