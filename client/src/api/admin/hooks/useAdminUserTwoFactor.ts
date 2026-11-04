import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetAdminUserTwoFactor } from "../endpoints";

export function useResetAdminUserTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => resetAdminUserTwoFactor(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}
