import { authedFetch } from "../../utils";

export interface AdminSiteData {
  siteId: number;
  name: string;
  type: "web" | "mobile" | null;
  domain: string;
  organizationId: string | null;
  createdAt: string;
  public: boolean;
  eventsLast24Hours: number;
  eventsLast30Days: number;
  goalsCount: number;
  funnelsCount: number;
  sessionReplay: boolean;
  organizationOwnerEmail: string | null;
  subscription: {
    planName: string;
    status: string;
  };
}

export function getAdminSites() {
  return authedFetch<AdminSiteData[]>("/admin/sites");
}

export function adminMoveSite(siteId: number, organizationId: string) {
  return authedFetch<{ success: boolean; organizationId: string }>(`/admin/sites/${siteId}/move`, undefined, {
    method: "PUT",
    data: { organizationId },
  });
}
