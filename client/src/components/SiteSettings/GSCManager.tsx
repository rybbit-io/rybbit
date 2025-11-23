"use client";

import { useConnectGSC, useDisconnectGSC, useGSCConnection } from "@/api/gsc/useGSCConnection";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { SiGoogle } from "@icons-pack/react-simple-icons";
import { ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface GSCManagerProps {
  disabled?: boolean;
}

export function GSCManager({ disabled = false }: GSCManagerProps) {
  const searchParams = useSearchParams();
  const { data: connection, isLoading, refetch } = useGSCConnection();
  const { mutate: connect, isPending: isConnecting } = useConnectGSC();
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectGSC();
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  // Check for OAuth success/error in URL params
  useEffect(() => {
    const gscStatus = searchParams.get("gsc");
    if (gscStatus === "success") {
      toast.success("Google Search Console connected successfully");
      refetch();
    }
  }, [searchParams, refetch]);

  const handleDisconnect = async () => {
    return new Promise((resolve, reject) => {
      disconnect(undefined, {
        onSuccess: () => {
          toast.success("Google Search Console disconnected");
          resolve(undefined);
        },
        onError: error => {
          toast.error("Failed to disconnect Google Search Console");
          reject(error);
        },
      });
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Google Search Console</h4>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isConnected = connection?.connected;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Google Search Console</h4>
        <p className="text-xs text-muted-foreground">
          Connect your Google Search Console account to view search performance data
        </p>
      </div>

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">●</span>
            <span className="text-muted-foreground">Connected to:</span>
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
            title="Disconnect Google Search Console?"
            description="This will remove the connection to Google Search Console. You can reconnect at any time."
            isOpen={isDisconnectModalOpen}
            setIsOpen={setIsDisconnectModalOpen}
            onConfirm={handleDisconnect}
            primaryAction={{ variant: "destructive", children: "Disconnect" }}
          >
            <Button variant="outline" disabled={disabled || isDisconnecting}>
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </ConfirmationModal>
        </div>
      ) : (
        <Button onClick={() => connect()} disabled={disabled || isConnecting}>
          <SiGoogle />
          {isConnecting ? "Connecting..." : "Connect Google Search Console"}
        </Button>
      )}
    </div>
  );
}
