import { NoOrganization } from "@/components/NoOrganization";
import { Button } from "@/components/ui/button";
import { OrganizationAccessDecision } from "@/lib/organizationAccess";

interface OrganizationAccessGateProps {
  children: React.ReactNode;
  decision: OrganizationAccessDecision;
  deniedMessage: string;
  errorMessage: string;
  loadingMessage: string;
  noOrganizationMessage: string;
  onRetry: () => void;
  retryLabel: string;
}

export function OrganizationAccessGate({
  children,
  decision,
  deniedMessage,
  errorMessage,
  loadingMessage,
  noOrganizationMessage,
  onRetry,
  retryLabel,
}: OrganizationAccessGateProps) {
  if (decision.allowed) {
    return children;
  }

  if (decision.reason === "active-organization-pending" || decision.reason === "membership-pending") {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse">{loadingMessage}</div>
      </div>
    );
  }

  if (decision.reason === "no-active-organization") {
    return <NoOrganization message={noOrganizationMessage} />;
  }

  if (decision.reason === "active-organization-error" || decision.reason === "membership-error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 p-6 text-center text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span>{errorMessage}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-6 text-center text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      {deniedMessage}
    </div>
  );
}
