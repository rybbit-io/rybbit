"use client";

import { Video } from "lucide-react";
import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { updateSiteConfig } from "../../../../api/admin/endpoints";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";
import { Button } from "../../../../components/ui/button";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";
import { IS_CLOUD } from "../../../../lib/const";

export function EnableSessionReplay() {
  const t = useExtracted();
  const params = useParams();
  const siteId = Number(params.site);
  const { data: siteMetadata, isLoading, refetch } = useGetSite(siteId);
  const { data: subscription } = useStripeSubscription();

  const canEnableReplay = !IS_CLOUD || (!!subscription?.planName.includes("pro") && !(subscription?.isTrial && (subscription?.eventLimit ?? 0) >= 500_000));

  if (isLoading || siteMetadata?.sessionReplay || !canEnableReplay) return null;

  return (
    <Alert className="p-4 bg-neutral-50/50 border-amber-200/50 dark:bg-neutral-800/25 dark:border-amber-600/80">
      <div className="flex items-start space-x-3">
        <Video className="h-5 w-5 mt-0.5 text-amber-600 dark:text-neutral-100" />
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-1 text-neutral-700/90 dark:text-neutral-100">
            {t("Session Replay is Disabled")}
          </AlertTitle>
          <AlertDescription className="text-sm text-neutral-700/80 dark:text-neutral-300/80">
            <div className="mb-2">
              {t("Session replay will make the analytics script")} <b>{t("8x larger")}</b> {t("and the client will send significantly more and larger payloads.")} <b>{t("Only enable this if you will actually use it.")}</b>
            </div>
            <Button
              size="sm"
              variant="success"
              onClick={async () => {
                await updateSiteConfig(siteId, { sessionReplay: true });
                toast.success(t("Session replay enabled"));
                refetch();
              }}
            >
              {t("Enable")}
            </Button>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
