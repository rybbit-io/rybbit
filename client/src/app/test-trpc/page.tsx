"use client";

import { useGetSitesFromOrg } from "@/api/admin/sites";
import { authClient } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function TestTRPC() {
  const [selectedSite, setSelectedSite] = useState<string>("");

  // Get the active organization
  const { data: activeOrganization } = authClient.useActiveOrganization();

  // Get sites from the organization
  const { data: sitesData, isLoading: sitesLoading } = useGetSitesFromOrg(
    activeOrganization?.id
  );

  // Auto-select the first site when sites are loaded
  if (sitesData?.sites && sitesData.sites.length > 0 && !selectedSite) {
    const firstSite = sitesData.sites[0].siteId.toString();
    console.log("🔍 DEBUG: Auto-selecting first site:", firstSite);
    setSelectedSite(firstSite);
  }

  console.log(
    "🔍 DEBUG: selectedSite:",
    selectedSite,
    "type:",
    typeof selectedSite
  );

  // Use the tRPC query with the selected site (keep as string since schema expects string)
  const { data, error, isLoading } = trpc.analytics.getOverview.useQuery(
    {
      site: selectedSite,
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      timeZone: "America/Los_Angeles",
      filters: "[]",
    },
    {
      enabled:
        !!selectedSite && selectedSite !== "" && !isNaN(Number(selectedSite)), // Only run query when we have a valid numeric site ID
    }
  );

  if (sitesLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">tRPC Test Page</h1>
        <p>Loading sites...</p>
      </div>
    );
  }

  if (!sitesData?.sites || sitesData.sites.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">tRPC Test Page</h1>
        <p className="text-red-500">No sites found for your organization.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">tRPC Test Page</h1>

      <div className="mb-4">
        <label className="block mb-2">Select Site:</label>
        <select
          value={selectedSite}
          onChange={(e) => {
            console.log("🔍 DEBUG: Site selection changed to:", e.target.value);
            setSelectedSite(e.target.value);
          }}
          className="border p-2 rounded"
        >
          {sitesData.sites.map((site) => (
            <option key={site.siteId} value={site.siteId.toString()}>
              {site.name} (ID: {site.siteId})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        <div>
          <strong>Organization:</strong> {activeOrganization?.name || "None"}
        </div>

        <div>
          <strong>Selected Site ID:</strong> {selectedSite || "None"}
        </div>

        <div>
          <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
        </div>

        <div>
          <strong>Error:</strong>{" "}
          {error ? (
            <pre className="text-red-500">{JSON.stringify(error, null, 2)}</pre>
          ) : (
            "None"
          )}
        </div>

        <div>
          <strong>Data:</strong>{" "}
          {data ? (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            "No data"
          )}
        </div>
      </div>
    </div>
  );
}
