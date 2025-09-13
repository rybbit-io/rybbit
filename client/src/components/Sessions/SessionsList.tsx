import { useEffect, useMemo, useRef } from "react";
import { useGetSessionsInfinite } from "../../api/analytics/userSessions";
import { SessionCard, SessionCardSkeleton } from "./SessionCard";
import { Button } from "../ui/button";
import { NothingFound } from "../NothingFound";
import { Rewind } from "lucide-react";

export default function SessionsList({ userId }: { userId?: string }) {
  // Get sessions data with infinite loading
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetSessionsInfinite(userId);

  // Combine all pages of data
  const flattenedData = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.data || []);
  }, [data]);

  // Reference for the scroll container
  const containerRef = useRef<HTMLDivElement>(null);

  if (error) return <div className="text-red-500 p-4">Error: {(error as Error).message}</div>;

  return (
    <div ref={containerRef} className="overflow-auto ">
      {isLoading ? (
        // Show skeleton cards while loading
        <SessionCardSkeleton />
      ) : flattenedData.length === 0 ? (
        <NothingFound
          icon={<Rewind className="w-10 h-10" />}
          title={"No sessions found"}
          description={"Try a different date range or filter"}
        />
      ) : (
        // Render session cards with more robust key generation
        flattenedData.map((session, index) => (
          <SessionCard key={`${session.session_id}-${index}`} session={session} userId={userId} />
        ))
      )}

      {isFetchingNextPage && (
        <div className="">
          <SessionCardSkeleton key="loading-more" />
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center py-2">
          <Button onClick={() => fetchNextPage()} className="w-full" variant="success">
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
