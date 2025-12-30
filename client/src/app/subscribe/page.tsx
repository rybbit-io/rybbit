"use client";

import { authClient } from "@/lib/auth";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { StandardPage } from "../../components/StandardPage";
import { UsageChart } from "../../components/UsageChart";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { FAQSection } from "./components/FAQSection";
import { PricingCard } from "./components/PricingCard";
import { PricingHeader } from "./components/PricingHeader";
import { useQueryState } from "nuqs";

function SubscribeContent() {
  const { data: sessionData } = authClient.useSession();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const router = useRouter();

  const [siteId, setSiteId] = useQueryState("siteId");

  // Redirect if already subscribed
  // if (subscription?.status === "active") {
  //   router.push("/settings/organization/subscription");
  // }

  // Get the active organization ID
  const organizationId = activeOrg?.id;

  // Get last 30 days of data
  const endDate = DateTime.now().toISODate();
  const startDate = DateTime.now().minus({ days: 30 }).toISODate();

  if (siteId) {
    return (
      <StandardPage>
        <div className="container mx-auto py-12 px-4">
          <PricingHeader />

          {/* Pricing Card */}
          <PricingCard isLoggedIn={!!sessionData?.user} />
        </div>
      </StandardPage>
    );
  }

  return (
    <StandardPage>
      <div className="container mx-auto py-12 px-4">
        <PricingHeader />

        {/* Pricing Card */}
        <PricingCard isLoggedIn={!!sessionData?.user} />

        {/* Usage Stats and Chart */}
        {organizationId && (
          <div className="max-w-lg mx-auto mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
            <UsageChart organizationId={organizationId} startDate={startDate} endDate={endDate} />
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-lg mx-auto">
          <FAQSection />
        </div>
      </div>
    </StandardPage>
  );
}

export default function Subscribe() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SubscribeContent />
    </Suspense>
  );
}
