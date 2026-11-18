import { authedFetch } from "../../utils";

export function resetAdminUserTwoFactor(userId: string) {
  return authedFetch<{ success: boolean }>(`/admin/users/${encodeURIComponent(userId)}/two-factor`, undefined, {
    method: "DELETE",
  });
}
