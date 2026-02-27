"use client";

import { authClient } from "@/lib/auth";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { StandardPage } from "../../components/StandardPage";
import { UsageChart } from "../../components/UsageChart";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { PricingCards } from "./components/PricingCards";
import { PricingHeader } from "./components/PricingHeader";
import { useQueryState } from "nuqs";

function SubscribeContent() {
  const { data: sessionData } = authClient.useSession();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const router = useRouter();

  const [siteId, setSiteId] = useQueryState("siteId");

  // Redirect if already subscribed
  // if (subscription?.status === "active" || subscription?.status === "trialing") {
  //   router.push("/settings/organization/subscription");
  // }

  // Get the active organization ID
  const organizationId = activeOrg?.id;

  if (siteId) {
    return (
      <StandardPage>
        <div className="container mx-auto py-12 px-4">
          <PricingHeader />
          {/* Pricing Card */}
          <PricingCards isLoggedIn={!!sessionData?.user} />
        </div>
      </StandardPage>
    );
  }

  return (
    <StandardPage>
      <div className="container mx-auto py-12 px-4">
        <PricingHeader />
        {/* Pricing Card */}
        <PricingCards isLoggedIn={!!sessionData?.user} />
        {/* Usage Stats and Chart */}
        {organizationId && (
          <div className="max-w-4xl mx-auto mt-6 bg-white dark:bg-neutral-900/80 rounded-xl border border-neutral-100 dark:border-neutral-850 p-6">
            <UsageChart organizationId={organizationId} />
          </div>
        )}
      </div>
    </StandardPage>
  );
}

export default function Subscribe() {
  const t = useExtracted();
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">{t("Loading...")}</div>}>
      <SubscribeContent />
    </Suspense>
  );
}
