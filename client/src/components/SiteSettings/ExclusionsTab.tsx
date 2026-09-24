"use client";

import { AlertCircle } from "lucide-react";
import { useExtracted } from "next-intl";

import { useGetSite } from "@/api/admin/hooks/useSites";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useGetExcludedPaths,
  useUpdateExcludedPaths,
  useGetExcludedHostnames,
  useUpdateExcludedHostnames,
  useGetExcludedUserAgents,
  useUpdateExcludedUserAgents,
  useGetExcludedASNs,
  useUpdateExcludedASNs,
  useGetExcludedQueryParams,
  useUpdateExcludedQueryParams,
} from "@/api/admin/hooks/useExclusions";
import { IPExclusionManager } from "./IPExclusionManager";
import { CountryExclusionManager } from "./CountryExclusionManager";
import { PatternExclusionManager } from "./PatternExclusionManager";
import { SettingsSection, SettingsSections } from "./SettingsSection";

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
  const asns = useGetExcludedASNs(siteId);
  const updateASNs = useUpdateExcludedASNs();
  const queryParams = useGetExcludedQueryParams(siteId);
  const updateQueryParams = useUpdateExcludedQueryParams();
  const site = useGetSite(siteId);
  const urlParamsTrackingOff = site.data?.trackUrlParams === false;

  return (
    <SettingsSections>
      <SettingsSection
        title={t("IP Exclusions")}
        description={t(
          "Exclude traffic from specific IP addresses or ranges. Supports single IPs (192.168.1.1), CIDR notation (192.168.1.0/24), and ranges (192.168.1.1-192.168.1.10)."
        )}
      >
        <IPExclusionManager siteId={siteId} disabled={disabled} />
      </SettingsSection>

      <SettingsSection
        title={t("Country Exclusions")}
        description={t(
          "Exclude traffic from specific countries. Events from these countries will not be tracked in your analytics."
        )}
      >
        <CountryExclusionManager siteId={siteId} disabled={disabled} />
      </SettingsSection>

      <SettingsSection
        title={t("ASN Exclusions")}
        description={t(
          "Exclude traffic from specific networks by autonomous system number, such as a corporate VPN or hosting provider. Enter the number with or without the AS prefix (e.g., AS13335 or 13335)."
        )}
      >
        <PatternExclusionManager
          placeholder="e.g., AS13335"
          addLabel={t("Add ASN")}
          loadingLabel={t("Loading ASN exclusions...")}
          maxLabel={t("Maximum 100 ASN exclusions allowed")}
          values={asns.data?.excludedASNs}
          isLoading={asns.isLoading}
          isSaving={updateASNs.isPending}
          onSave={excludedASNs => updateASNs.mutateAsync({ siteId, excludedASNs })}
          disabled={disabled}
        />
      </SettingsSection>

      <SettingsSection
        title={t("Path Exclusions")}
        description={t(
          "Exclude traffic to specific pages. Use * as a wildcard (e.g., /admin/* or /preview). Matching is case-insensitive."
        )}
      >
        <PatternExclusionManager
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
      </SettingsSection>

      <SettingsSection
        title={t("Query Param Exclusions")}
        description={t(
          "Exclude traffic to URLs containing specific query parameters. Use a param name alone (e.g., preview) to match whenever it is present, or name=value to match a specific value. Values support * as a wildcard and matching is case-insensitive."
        )}
      >
        {urlParamsTrackingOff && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t(
                "URL Parameters tracking is disabled for this site, so events are sent without their query string and these exclusions will not match. Enable URL Parameters in the Tracking tab to use them."
              )}
            </AlertDescription>
          </Alert>
        )}
        <PatternExclusionManager
          placeholder="e.g., preview or utm_source=internal"
          addLabel={t("Add Query Param")}
          loadingLabel={t("Loading query param exclusions...")}
          maxLabel={t("Maximum 100 query param exclusions allowed")}
          values={queryParams.data?.excludedQueryParams}
          isLoading={queryParams.isLoading}
          isSaving={updateQueryParams.isPending}
          onSave={excludedQueryParams => updateQueryParams.mutateAsync({ siteId, excludedQueryParams })}
          disabled={disabled}
        />
      </SettingsSection>

      <SettingsSection
        title={t("Hostname Exclusions")}
        description={t(
          "Exclude traffic from specific hostnames such as staging or preview domains. Use * as a wildcard (e.g., localhost or *.vercel.app). Matching is case-insensitive."
        )}
      >
        <PatternExclusionManager
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
      </SettingsSection>

      <SettingsSection
        title={t("User Agent Exclusions")}
        description={t(
          "Exclude traffic from user agents containing any of these terms. Matching is a case-insensitive substring (e.g., HeadlessChrome)."
        )}
      >
        <PatternExclusionManager
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
      </SettingsSection>
    </SettingsSections>
  );
}
