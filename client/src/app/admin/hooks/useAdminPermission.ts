"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth";

interface AdminPermissionState {
  isAdmin: boolean;
  isImpersonating: boolean;
  isCheckingAdmin: boolean;
}

export function useAdminPermission() {
  const [state, setState] = useState<AdminPermissionState>({
    isAdmin: false,
    isImpersonating: false,
    isCheckingAdmin: true,
  });

  useEffect(() => {
    async function checkAdminPermission() {
      try {
        // Check if the user has admin access
        const result = await authClient.admin.hasPermission({
          permissions: {
            user: ["impersonate"],
          },
        });

        // Check if the user is currently impersonating
        const session = await authClient.getSession();
        const isImpersonating = Boolean(session.data?.session?.impersonatedBy);

        setState({
          isAdmin: result.data?.success ?? false,
          isImpersonating,
          isCheckingAdmin: false,
        });
      } catch (err) {
        setState({
          isAdmin: false,
          isImpersonating: false,
          isCheckingAdmin: false,
        });
        console.error("Error checking admin status:", err);
      }
    }

    checkAdminPermission();
  }, []);

  const stopImpersonating = async () => {
    try {
      await authClient.admin.stopImpersonating();
      setState(prev => ({ ...prev, isImpersonating: false }));
      window.location.reload();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error(`Failed to stop impersonation: ${errorMessage}`);
      return false;
    }
  };

  return {
    ...state,
    stopImpersonating,
  };
}
