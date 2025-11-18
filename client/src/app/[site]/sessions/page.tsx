"use client";

import { useState } from "react";
import { useGetSessions } from "../../../api/analytics/useGetUserSessions";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { SESSION_PAGE_FILTERS } from "../../../lib/filterGroups";
import { SubHeader } from "../components/SubHeader/SubHeader";
import { SessionsList } from "@/components/Sessions/SessionsList";

const LIMIT = 100;

export default function SessionsPage() {
  useSetPageTitle("Rybbit · Sessions");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetSessions(undefined, page, LIMIT + 1);
  const allSessions = data?.data || [];
  const hasNextPage = allSessions.length > LIMIT;
  const sessions = allSessions.slice(0, LIMIT);
  const hasPrevPage = page > 1;

  return (
    <DisabledOverlay message="Sessions" featurePath="sessions">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto space-y-3">
        <SubHeader availableFilters={SESSION_PAGE_FILTERS} />
        <SessionsList
          sessions={sessions}
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
        />
      </div>
    </DisabledOverlay>
  );
}
