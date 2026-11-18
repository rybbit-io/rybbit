"use client";

import { isDpaCountersignatureReady } from "@rybbit/shared";
import { useExtracted } from "next-intl";
import { ExternalLink } from "@/components/ExternalLink";
import { NoOrganization } from "@/components/NoOrganization";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetPageTitle } from "@/hooks/useSetPageTitle";
import { authClient } from "@/lib/auth";
import { IS_CLOUD } from "@/lib/const";
import { LedgerRow, LedgerRows, LedgerSection } from "../components/Ledger";
import { SignDpaForm } from "./components/SignDpaForm";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <LedgerSection title={title}>
      <p className="max-w-prose text-sm text-neutral-600 dark:text-neutral-300">{children}</p>
    </LedgerSection>
  );
}

export default function DpaPage() {
  useSetPageTitle("Data Processing Agreement");
  const t = useExtracted();
  const { data: session } = authClient.useSession();
  const organizationId = session?.session.activeOrganizationId ?? undefined;

  if (!IS_CLOUD) {
    return (
      <Notice title={t("Not needed when self-hosting")}>
        {t(
          "The DPA covers data Rybbit Cloud processes for you. On your own instance the data never reaches Rybbit, so there's nothing to sign."
        )}
      </Notice>
    );
  }

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

  if (isDpaCountersignatureReady()) {
    return (
      <SignDpaForm
        key={organizationId}
        organizationId={organizationId}
        defaults={{ signerName: userName, signerEmail: session?.user.email ?? "" }}
      />
    );
  }

  return (
    <Notice title={t("Self-serve signing is coming soon")}>
      {t.rich(
        "Read the agreement at <dpa>rybbit.com/dpa</dpa>. Until signing opens here, <contact>contact us</contact> and we'll send you a countersigned copy.",
        {
          dpa: chunks => <ExternalLink href="https://rybbit.com/dpa">{chunks}</ExternalLink>,
          contact: chunks => <ExternalLink href="https://rybbit.com/contact">{chunks}</ExternalLink>,
        }
      )}
    </Notice>
  );
}
