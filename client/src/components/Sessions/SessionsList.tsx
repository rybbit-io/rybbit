import { ChevronLeft, ChevronRight, Rewind } from "lucide-react";
import { GetSessionsResponse } from "../../api/analytics/useGetUserSessions";
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
}

export function SessionsList({
  sessions,
  isLoading,
  page,
  onPageChange,
  hasNextPage,
  hasPrevPage,
  emptyMessage = "Try a different date range or filter",
  userId,
}: SessionsListProps) {
  if (sessions.length === 0 && !isLoading) {
    return (
      <div className="overflow-auto space-y-3">
        <NothingFound icon={<Rewind className="w-10 h-10" />} title={"No sessions found"} description={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="overflow-auto space-y-3">
      {/* Pagination controls */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="smIcon" onClick={() => onPageChange(page - 1)} disabled={!hasPrevPage}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">Page {page}</span>
        <Button variant="ghost" size="smIcon" onClick={() => onPageChange(page + 1)} disabled={!hasNextPage}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Session cards */}
      {isLoading ? (
        <SessionCardSkeleton />
      ) : (
        sessions.map((session, index) => (
          <SessionCard key={`${session.session_id}-${index}`} session={session} userId={userId} />
        ))
      )}
    </div>
  );
}
