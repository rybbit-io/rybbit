import { Building2 } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState, useEffect } from "react";
import { useActiveOrganizationId } from "../hooks/useActiveOrganizationId";
import { authClient } from "../lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useUserOrganizations } from "../api/admin/hooks/useOrganizations";

export function OrganizationSelector() {
  const t = useExtracted();
  const { data: organizations, isLoading: isLoadingOrganizations } = useUserOrganizations();
  // The active org id resolves from the lightweight session rather than the
  // heavy get-full-organization call, so the selector never hangs on "Loading".
  const activeOrganizationId = useActiveOrganizationId();

  // Local state to handle the delay when switching organizations
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Update local state when the active organization changes
  useEffect(() => {
    if (activeOrganizationId) {
      setSelectedOrgId(activeOrganizationId);
    }
  }, [activeOrganizationId]);

  const handleValueChange = (organizationId: string) => {
    // Update local state immediately for responsive UI
    setSelectedOrgId(organizationId);
    // Then update the actual active organization
    authClient.organization.setActive({
      organizationId,
    });
  };

  if (!isLoadingOrganizations && organizations?.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("No organizations")} />
        </SelectTrigger>
      </Select>
    );
  }

  // Show placeholder only while the organization list is still loading
  if (isLoadingOrganizations && !organizations) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("Loading...")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="placeholder" disabled>
            {t("Loading organizations...")}
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={selectedOrgId || activeOrganizationId || undefined}
      onValueChange={handleValueChange}
      disabled={!organizations || organizations.length === 0}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t("Select an organization")} />
      </SelectTrigger>
      <SelectContent>
        {organizations?.map(org => (
          <SelectItem key={org.id} value={org.id}>
            <div className="flex items-center min-w-0">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <span className="truncate">{org.name}</span>
            </div>
          </SelectItem>
        ))}
        {(!organizations || organizations.length === 0) && (
          <SelectItem value="no-org" disabled>
            {t("No organizations available")}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
