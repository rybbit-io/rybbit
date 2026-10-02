"use client";

import { Video } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";
import { useUserRepeatedError } from "../../../../../api/analytics/hooks/useUserProfile";
import { ReplayDrawer } from "../../../../../components/Sessions/ReplayDrawer";
import { InsightRow } from "../../../../../components/site/InsightRow";
import { Button } from "../../../../../components/ui/button";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { useReplayAvailable } from "../../../../../hooks/useReplayAvailable";
import { useTimezone } from "../../../../../lib/store";

/**
 * One sentence, shown only when it is true: in the selected period this user
 * hit the same error more than once in a single session. The rule is fixed
 * (one message, one session, two or more times; the latest such session wins)
 * and the server evaluates it, so the row never guesses.
 */
export function UserErrorInsight({ userId }: { userId: string }) {
  const t = useExtracted();
  const zone = useTimezone();
  const replayAvailable = useReplayAvailable();
  const { formatDateTime, formatRelative } = useDateTimeFormat();
  const [replayOpen, setReplayOpen] = useState(false);
  const { data: repeated } = useUserRepeatedError(userId);

  if (!repeated) return null;

  const firstSeen = DateTime.fromSQL(repeated.first_seen, { zone: "utc" }).setZone(zone);
  const when = firstSeen.isValid ? formatRelative(firstSeen) : "";
  const exact = firstSeen.isValid
    ? formatDateTime(firstSeen, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: zone,
      })
    : undefined;

  const strong = (chunks: ReactNode) => (
    <span className="font-medium text-neutral-900 dark:text-neutral-50">{chunks}</span>
  );
  const values = { count: repeated.occurrences.toLocaleString(), path: repeated.pathname, when, strong };
  const canWatch = repeated.has_replay && replayAvailable;

  return (
    <>
      <InsightRow
        action={
          canWatch ? (
            <Button
              variant="ghost"
              size="xs"
              className="hidden shrink-0 gap-1 md:inline-flex"
              onClick={() => setReplayOpen(true)}
            >
              <Video />
              {t("Watch replay")}
            </Button>
          ) : undefined
        }
      >
        <span title={exact}>
          {repeated.pathname
            ? t.rich("Hit the same error {count} times in one session {when}, on <strong>{path}</strong>:", values)
            : t.rich("Hit the same error {count} times in one session {when}:", values)}
        </span>{" "}
        <span className="break-words font-mono text-xs text-neutral-600 dark:text-neutral-300">{repeated.message}</span>
      </InsightRow>
      {canWatch && <ReplayDrawer sessionId={repeated.session_id} open={replayOpen} onOpenChange={setReplayOpen} />}
    </>
  );
}
