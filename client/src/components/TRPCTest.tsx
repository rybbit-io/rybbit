"use client";

import { useGetOverviewTRPC } from "../api/analytics/useGetOverviewTRPC";

export function TRPCTest() {
  const { data, isLoading, error } = useGetOverviewTRPC({
    site: "test-site",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    timeZone: "America/Los_Angeles",
    filters: "[]",
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>tRPC Test Component</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
