"use client";

import { Video } from "lucide-react";
import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { updateSiteConfig } from "../../../../api/admin/endpoints";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";
import { Button } from "../../../../components/ui/button";
import { planIncludesReplay } from "../../../../lib/subscription/planUtils";
import { useStripeSubscription } from "../../../../lib/subscription/useStripeSubscription";
import { IS_CLOUD } from "../../../../lib/const";

export function EnableSessionReplay() {
  const t = useExtracted();
  const params = useParams();
  const siteId = Number(params.site);
  const { data: siteMetadata, isLoading, refetch } = useGetSite(siteId);
  const { data: subscription } = useStripeSubscription();
  const [isEnabling, setIsEnabling] = useState(false);

  const canEnableReplay = !IS_CLOUD || planIncludesReplay(subscription);

  if (isLoading || siteMetadata?.sessionReplay || !canEnableReplay) return null;

  const enable = async () => {
    setIsEnabling(true);
    try {
      await updateSiteConfig(siteId, { sessionReplay: true });
      // Stay busy until the refetch hides this banner, so "Enable" never flashes back
      await refetch();
      toast.success(t("Session replay enabled"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("Failed to enable session replay: {message}", { message }));
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Alert className="shrink-0 p-4">
      <div className="flex items-start space-x-3">
        <Video className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-1 text-neutral-700/90 dark:text-neutral-100">
            {t("Session Replay is Disabled")}
          </AlertTitle>
          <AlertDescription className="text-sm text-neutral-700/80 dark:text-neutral-300/80">
            <div className="mb-2">
              {t("Session replay will make the analytics script")} <b>{t("8x larger")}</b>{" "}
              {t("and the client will send significantly more and larger payloads.")}{" "}
              <b>{t("Only enable this if you will actually use it.")}</b>
            </div>
            <Button size="sm" variant="success" loading={isEnabling} onClick={enable}>
              {t("Enable")}
            </Button>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
