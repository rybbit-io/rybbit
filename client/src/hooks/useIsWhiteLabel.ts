import { authClient } from "../lib/auth";
import { useActiveOrganizationId } from "./useActiveOrganizationId";

const WHITE_LABEL_ORGANIZATIONS: Record<string, string> = { XQroMSqHm87DPcvFozpajPI7ufVdxta6: "/ruby.png" };

export function useWhiteLabel() {
  const activeOrganizationId = useActiveOrganizationId();
  // The active org id resolves from the lightweight session, so gate on that
  // rather than the heavy get-full-organization call — this also avoids briefly
  // showing the Rybbit logo before a white-label org's image loads.
  const { isPending } = authClient.useSession();
  return {
    isWhiteLabel: !!WHITE_LABEL_ORGANIZATIONS[activeOrganizationId || ""],
    whiteLabelImage: WHITE_LABEL_ORGANIZATIONS[activeOrganizationId || ""],
    isPending,
  };
}
