import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { refreshSiteConfigurationSummaries } from "./useSiteConfiguration";

describe("refreshSiteConfigurationSummaries", () => {
  it("invalidates every shared summary of Site Configuration", async () => {
    const queryClient = new QueryClient();
    const affectedKeys = [
      ["get-site", 42],
      ["get-site", "42"],
      ["get-sites-from-org", "org-1"],
      ["admin-organizations", { page: 1 }],
    ] as const;
    const unrelatedKey = ["site-has-data", "42"] as const;

    for (const queryKey of [...affectedKeys, unrelatedKey]) {
      queryClient.setQueryData(queryKey, { cached: true });
    }

    await refreshSiteConfigurationSummaries(queryClient);

    for (const queryKey of affectedKeys) {
      expect(queryClient.getQueryState(queryKey)?.isInvalidated, JSON.stringify(queryKey)).toBe(true);
    }
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false);
  });
});
