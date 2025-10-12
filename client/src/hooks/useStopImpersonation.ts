import { useEffect } from "react";
import { authClient } from "@/lib/auth";

// Add stopImpersonating to Window interface
declare global {
  interface Window {
    stopImpersonating: () => Promise<boolean>;
  }
}

export function useStopImpersonation() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.stopImpersonating = async () => {
        try {
          await authClient.admin.stopImpersonating();
          window.location.href = "/admin";
          return true;
        } catch (err) {
          console.error("Failed to stop impersonation:", err);
          return false;
        }
      };
    }
  }, []);
}
