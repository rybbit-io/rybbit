"use client";

import { authClient } from "@/lib/auth";
import { getStripePrices } from "@/lib/stripe";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { TrendingUp } from "lucide-react";
import { StandardPage } from "../../components/StandardPage";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { useGetOrgEventCount } from "../../api/analytics/useGetOrgEventCount";
import { UsageChart } from "../../components/UsageChart";
import { PricingHeader } from "./components/PricingHeader";
import { PricingCard } from "./components/PricingCard";
import { FAQSection } from "./components/FAQSection";

export default function Subscribe() {
  const { data: sessionData } = authClient.useSession();
  const { data: subscription } = useStripeSubscription();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const router = useRouter();

  // Redirect if already subscribed
  if (subscription?.status === "active") {
    router.push("/settings/organization/subscription");
  }

  // Get the active organization ID
  const organizationId = activeOrg?.id;

  // Get last 30 days of data
  const endDate = DateTime.now().toISODate();
  const startDate = DateTime.now().minus({ days: 30 }).toISODate();

  // Fetch usage data for the chart and total calculation
  const { data: eventCountData } = useGetOrgEventCount({
    organizationId: organizationId || "",
    startDate,
    endDate,
    enabled: !!organizationId,
  });

  // Calculate total events over the past 30 days
  const totalEvents = eventCountData?.data?.reduce((sum, day) => sum + day.event_count, 0) || 0;

  return (
    <StandardPage>
      <div className="container mx-auto py-12 px-4">
        <PricingHeader />

        {/* Pricing Card */}
        <PricingCard stripePrices={getStripePrices()} isLoggedIn={!!sessionData?.user} />

        {/* Usage Stats and Chart */}
        {organizationId && (
          <div className="max-w-lg mx-auto mt-6">
            <div className="bg-blue-900/20 rounded-xl border border-blue-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <h3 className="font-semibold text-lg">Your Usage (Last 30 Days)</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-300">{totalEvents.toLocaleString()}</p>
                  <p className="text-xs text-neutral-400">total events</p>
                </div>
              </div>

              <div className="p-1">
                <UsageChart organizationId={organizationId} startDate={startDate} endDate={endDate} />
              </div>
            </div>
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
