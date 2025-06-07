import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../../lib/const";
import { authedFetchWithError } from "../utils";

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
    domains: string[];
    createdAt: string;
    eventsLast24Hours: number;
  }[];
  members: {
    userId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export async function getAdminOrganizations() {
  return authedFetchWithError<AdminOrganizationData[]>(
    `${BACKEND_URL}/admin/organizations`
  );
}

export function useAdminOrganizations() {
  return useQuery<AdminOrganizationData[]>({
    queryKey: ["admin-organizations"],
    queryFn: getAdminOrganizations,
  });
}
