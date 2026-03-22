import { ChevronLeft, ChevronRight, Rewind } from "lucide-react";
import { useExtracted } from "next-intl";
import { GetSessionsResponse } from "../../api/analytics/endpoints";
import { NothingFound } from "../NothingFound";
import { Button } from "../ui/button";
import { SessionCard, SessionCardSkeleton } from "./SessionCard";

interface SessionsListProps {
  sessions: GetSessionsResponse;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  emptyMessage?: string;
  userId?: string;
  headerElement?: React.ReactNode;
  pageSize?: number;
}

export function SessionsList({
  sessions,
  isLoading,
  page,
  onPageChange,
  hasNextPage,
  hasPrevPage,
  emptyMessage,
  userId,
  headerElement,
  pageSize,
}: SessionsListProps) {
  const t = useExtracted();
  return (
    <div className="space-y-3">
      {/* Header and pagination controls */}
      <div className="flex items-center justify-between gap-2">
        {headerElement}
        <div className="flex items-center justify-end gap-2 ml-auto">
          <Button variant="ghost" size="smIcon" onClick={() => onPageChange(page - 1)} disabled={!hasPrevPage}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t("Page {page}", { page: String(page) })}</span>
          <Button variant="ghost" size="smIcon" onClick={() => onPageChange(page + 1)} disabled={!hasNextPage}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {sessions.length === 0 && !isLoading && (
        <NothingFound icon={<Rewind className="w-10 h-10" />} title={t("No sessions found")} description={emptyMessage || t("Try a different date range or filter")} />
      )}

      {/* Session cards */}
      {isLoading ? (
        <SessionCardSkeleton userId={userId} count={pageSize} />
      ) : (
        sessions.map((session, index) => (
          <SessionCard key={`${session.session_id}-${index}`} session={session} userId={userId} />
        ))
      )}
    </div>
  );
}
