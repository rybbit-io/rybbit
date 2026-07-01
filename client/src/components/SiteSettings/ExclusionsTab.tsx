"use client";

import { useExtracted } from "next-intl";

import {
  useGetExcludedPaths,
  useUpdateExcludedPaths,
  useGetExcludedHostnames,
  useUpdateExcludedHostnames,
  useGetExcludedUserAgents,
  useUpdateExcludedUserAgents,
} from "@/api/admin/hooks/useExclusions";
import { IPExclusionManager } from "./IPExclusionManager";
import { CountryExclusionManager } from "./CountryExclusionManager";
import { PatternExclusionManager } from "./PatternExclusionManager";

interface ExclusionsTabProps {
  siteId: number;
  disabled?: boolean;
}

export function ExclusionsTab({ siteId, disabled = false }: ExclusionsTabProps) {
  const t = useExtracted();

  const paths = useGetExcludedPaths(siteId);
  const updatePaths = useUpdateExcludedPaths();
  const hostnames = useGetExcludedHostnames(siteId);
  const updateHostnames = useUpdateExcludedHostnames();
  const userAgents = useGetExcludedUserAgents(siteId);
  const updateUserAgents = useUpdateExcludedUserAgents();

  return (
    <div className="space-y-6">
      <IPExclusionManager siteId={siteId} disabled={disabled} />
      <CountryExclusionManager siteId={siteId} disabled={disabled} />

      <PatternExclusionManager
        label={t("Path Exclusions")}
        description={t(
          "Exclude traffic to specific pages. Use * as a wildcard (e.g., /admin/* or /preview). Matching is case-insensitive."
        )}
        placeholder="e.g., /admin/* or /preview"
        addLabel={t("Add Path")}
        loadingLabel={t("Loading path exclusions...")}
        maxLabel={t("Maximum 100 path exclusions allowed")}
        values={paths.data?.excludedPaths}
        isLoading={paths.isLoading}
        isSaving={updatePaths.isPending}
        onSave={excludedPaths => updatePaths.mutateAsync({ siteId, excludedPaths })}
        disabled={disabled}
      />

      <PatternExclusionManager
        label={t("Hostname Exclusions")}
        description={t(
          "Exclude traffic from specific hostnames such as staging or preview domains. Use * as a wildcard (e.g., localhost or *.vercel.app). Matching is case-insensitive."
        )}
        placeholder="e.g., localhost or *.vercel.app"
        addLabel={t("Add Hostname")}
        loadingLabel={t("Loading hostname exclusions...")}
        maxLabel={t("Maximum 100 hostname exclusions allowed")}
        values={hostnames.data?.excludedHostnames}
        isLoading={hostnames.isLoading}
        isSaving={updateHostnames.isPending}
        onSave={excludedHostnames => updateHostnames.mutateAsync({ siteId, excludedHostnames })}
        disabled={disabled}
      />

      <PatternExclusionManager
        label={t("User Agent Exclusions")}
        description={t(
          "Exclude traffic from user agents containing any of these terms. Matching is a case-insensitive substring (e.g., HeadlessChrome)."
        )}
        placeholder="e.g., HeadlessChrome"
        addLabel={t("Add User Agent")}
        loadingLabel={t("Loading user agent exclusions...")}
        maxLabel={t("Maximum 100 user agent exclusions allowed")}
        values={userAgents.data?.excludedUserAgents}
        isLoading={userAgents.isLoading}
        isSaving={updateUserAgents.isPending}
        onSave={excludedUserAgents => updateUserAgents.mutateAsync({ siteId, excludedUserAgents })}
        disabled={disabled}
      />
    </div>
  );
}
