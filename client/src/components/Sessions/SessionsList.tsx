import { Rewind } from "lucide-react";
import { useExtracted } from "next-intl";
import { GetSessionsResponse } from "../../api/analytics/endpoints";
import { NothingFound } from "../NothingFound";
import { Pagination } from "../pagination";
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
        <Pagination
          className="ml-auto w-auto"
          page={page}
          onPageChange={onPageChange}
          hasPreviousPage={hasPrevPage}
          hasNextPage={hasNextPage}
        />
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
