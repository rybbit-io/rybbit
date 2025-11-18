import { useQuery } from "@tanstack/react-query";
import { authedFetch } from "../utils";

export interface AdminOrganizationData {
  id: string;
  name: string;
  createdAt: string;
  monthlyEventCount: number;
  overMonthlyLimit: boolean;
  subscription: {
    id: string | null;
    planName: string;
    status: string;
    eventLimit: number;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    interval?: string;
  };
  sites: {
    siteId: number;
    name: string;
    domain: string;
    createdAt: string;
    eventsLast24Hours: number;
    eventsLast30Days: number;
  }[];
  members: {
    userId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

async function getAdminOrganizations() {
  return authedFetch<AdminOrganizationData[]>("/admin/organizations");
}

export function useAdminOrganizations() {
  return useQuery<AdminOrganizationData[]>({
    queryKey: ["admin-organizations"],
    queryFn: getAdminOrganizations,
  });
}
