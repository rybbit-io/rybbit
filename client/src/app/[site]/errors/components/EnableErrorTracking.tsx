"use client";

import { useExtracted } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { updateSiteConfig } from "../../../../api/admin/endpoints";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";
import { Button } from "../../../../components/ui/button";
import { useCanOnSite } from "../../../../hooks/usePermissions";

export function EnableErrorTracking() {
  const t = useExtracted();
  const params = useParams();
  const siteId = Number(params.site);
  const { data: siteMetadata, refetch } = useGetSite(siteId);
  const [isEnabling, setIsEnabling] = useState(false);
  const canConfigure = useCanOnSite("sites:configure", siteId);

  if (siteMetadata?.trackErrors) return null;

  const enable = async () => {
    setIsEnabling(true);
    try {
      await updateSiteConfig(siteId, { trackErrors: true });
      // Stay busy until the refetch hides this banner, so "Enable" never flashes back
      await refetch();
      toast.success(t("Error tracking enabled"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("Failed to enable error tracking: {message}", { message }));
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Alert className="p-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-1 text-neutral-700/90 dark:text-neutral-100">
            {t("Error Tracking is Disabled")}
          </AlertTitle>
          <AlertDescription className="text-sm text-neutral-700/80 dark:text-neutral-300/80">
            <div className="mb-2">
              {t("Error tracking captures JavaScript errors and exceptions from your application.")} <b>{t("Note:")}</b>{" "}
              {t("Enabling error tracking will increase your event usage.")}
            </div>
            {canConfigure ? (
              <Button size="sm" variant="success" loading={isEnabling} onClick={enable}>
                {t("Enable")}
              </Button>
            ) : (
              <p>{t("Ask a site admin to enable it.")}</p>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
