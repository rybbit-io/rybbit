import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminOrganizationData,
  AdminSubscriptionOverrideInput,
  deleteAdminOrganizationMember,
  getAdminOrganizationMember,
  getAdminOrganizationOptions,
  getAdminOrganizations,
  getAdminSubscriptionPlans,
  updateAdminOrganizationMember,
  updateAdminSubscriptionOverride,
  UpdateAdminOrganizationMemberInput,
} from "../endpoints";

export function useAdminOrganizations() {
  return useQuery<AdminOrganizationData[]>({
    queryKey: ["admin-organizations"],
    queryFn: getAdminOrganizations,
    staleTime: 60_000,
  });
}

export function useAdminOrganizationOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: ["admin-organization-options", search],
    queryFn: () => getAdminOrganizationOptions(search),
    staleTime: 60_000,
    enabled,
  });
}

export function useAdminSubscriptionPlans() {
  return useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: getAdminSubscriptionPlans,
    staleTime: Infinity,
  });
}

export function useUpdateAdminSubscriptionOverride(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminSubscriptionOverrideInput) => updateAdminSubscriptionOverride(organizationId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
  });
}

export function useAdminOrganizationMember(organizationId: string, memberId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-organization-member", organizationId, memberId],
    queryFn: () => getAdminOrganizationMember(organizationId, memberId!),
    enabled: enabled && !!memberId,
  });
}

export function useUpdateAdminOrganizationMember(organizationId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAdminOrganizationMemberInput) =>
      updateAdminOrganizationMember(organizationId, memberId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-organization-member", organizationId, memberId] });
    },
  });
}

export function useDeleteAdminOrganizationMember(organizationId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAdminOrganizationMember(organizationId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
