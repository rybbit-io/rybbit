import { authClient } from "../lib/auth";

const WHITE_LABEL_ORGANIZATIONS: Record<string, string> = { XQroMSqHm87DPcvFozpajPI7ufVdxta6: "/ruby.png" };

export function useWhiteLabel() {
  const { data: activeOrganization, isPending } = authClient.useActiveOrganization();
  return {
    isWhiteLabel: !!WHITE_LABEL_ORGANIZATIONS[activeOrganization?.id || ""],
    whiteLabelImage: WHITE_LABEL_ORGANIZATIONS[activeOrganization?.id || ""],
    isPending,
  };
}
