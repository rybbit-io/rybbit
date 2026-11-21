import { Rewind } from "lucide-react";
import { useExtracted } from "next-intl";
import { GetSessionsResponse } from "../../api/analytics/endpoints";
import { ErrorState } from "../ErrorState";
import { NothingFound } from "../NothingFound";
import { Pagination } from "../pagination";
import { SessionCard, SessionCardSkeleton } from "./SessionCard";

interface SessionsListProps {
  sessions: GetSessionsResponse;
  isLoading: boolean;
  /** A failed fetch shows an error with a retry, not "No sessions found". */
  isError?: boolean;
  onRetry?: () => void;
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
  isError,
  onRetry,
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

      {isError && !isLoading && sessions.length === 0 && <ErrorState title="" message="" refetch={onRetry} />}

      {sessions.length === 0 && !isLoading && !isError && (
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
