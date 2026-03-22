"use client";

import { useConnectGSC } from "@/api/gsc/hooks/useConnectGSC";
import { useDisconnectGSC } from "@/api/gsc/hooks/useDisconnectGSC";
import { useGetGSCConnection } from "@/api/gsc/hooks/useGetGSCConnection";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { SiGoogle } from "@icons-pack/react-simple-icons";
import { ExternalLink } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useQueryState, parseAsString } from "nuqs";

interface GSCManagerProps {
  disabled?: boolean;
}

export function GSCManager({ disabled = false }: GSCManagerProps) {
  const t = useExtracted();
  const [gscStatus] = useQueryState("gsc", parseAsString);
  const { data: connection, isLoading, refetch } = useGetGSCConnection();
  const { mutate: connect, isPending: isConnecting } = useConnectGSC();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectGSC();
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  // Check for OAuth success/error in URL params
  useEffect(() => {
    if (gscStatus === "success") {
      toast.success(t("Google Search Console connected successfully"));
      refetch();
    }
  }, [gscStatus, refetch]);

  const handleDisconnect = async () => {
    return new Promise((resolve, reject) => {
      disconnect(undefined, {
        onSuccess: () => {
          toast.success(t("Google Search Console disconnected"));
          resolve(undefined);
        },
        onError: error => {
          toast.error(t("Failed to disconnect Google Search Console"));
          reject(error);
        },
      });
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t("Google Search Console")}</h4>
          <p className="text-xs text-muted-foreground">{t("Loading...")}</p>
        </div>
      </div>
    );
  }

  const isConnected = connection?.connected;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{t("Google Search Console")}</h4>
        <p className="text-xs text-muted-foreground">
          {t("Connect your Google Search Console account to view search performance data")}
        </p>
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">●</span>
            <span className="text-muted-foreground">{t("Connected to:")}</span>
            <a
              href={connection.gscPropertyUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline flex items-center gap-1"
            >
              {connection.gscPropertyUrl?.replace("sc-domain:", "")}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <ConfirmationModal
            title={t("Disconnect Google Search Console?")}
            description={t("This will remove the connection to Google Search Console. You can reconnect at any time.")}
            isOpen={isDisconnectModalOpen}
            setIsOpen={setIsDisconnectModalOpen}
            onConfirm={handleDisconnect}
            primaryAction={{ variant: "destructive", children: t("Disconnect") }}
          >
            <Button variant="outline" disabled={disabled || isDisconnecting}>
              {isDisconnecting ? t("Disconnecting...") : t("Disconnect")}
            </Button>
          </ConfirmationModal>
        </div>
      ) : (
        <Button onClick={() => connect()} disabled={disabled || isConnecting}>
          <SiGoogle />
          {isConnecting ? t("Connecting...") : t("Connect Google Search Console")}
        </Button>
      )}
    </div>
  );
}
