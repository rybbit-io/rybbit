"use client";

import { useExtracted } from "next-intl";
import { NoOrganization } from "@/components/NoOrganization";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
import { LedgerRow, LedgerRows, LedgerSection } from "../components/Ledger";
import { SignDpaForm } from "./components/SignDpaForm";

export default function DpaPage() {
  useSetPageTitle("Data Processing Agreement");
  const t = useExtracted();
  const { data: session } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId ?? undefined;

  if (session && !organizationId) {
    return <NoOrganization message={t("Select an organization to sign its DPA.")} />;
  }

  if (!organizationId) {
    return (
      <LedgerSection title={<Skeleton className="h-5 w-32" />}>
        <LedgerRows>
          {Array.from({ length: 3 }).map((_, index) => (
            <LedgerRow key={index} label={<Skeleton className="h-4 w-28" />}>
              <Skeleton className="h-9 w-full" />
            </LedgerRow>
          ))}
        </LedgerRows>
      </LedgerSection>
    );
  }

  const userName = session?.user.name && !session.user.name.includes("@") ? session.user.name : "";

  return (
    <SignDpaForm
      key={organizationId}
      organizationId={organizationId}
      defaults={{ signerName: userName, signerEmail: session?.user.email ?? "" }}
    />
  );
}
