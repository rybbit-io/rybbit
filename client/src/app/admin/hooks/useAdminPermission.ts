"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth";

interface AdminPermissionState {
  isAdmin: boolean;
  isCheckingAdmin: boolean;
}

export function useAdminPermission() {
  const [state, setState] = useState<AdminPermissionState>({
    isAdmin: false,
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

        setState({
          isAdmin: result.data?.success ?? false,
          isCheckingAdmin: false,
        });
      } catch (err) {
        setState({
          isAdmin: false,
          isCheckingAdmin: false,
        });
        console.error("Error checking admin status:", err);
      }
    }

    checkAdminPermission();
  }, []);

  return state;
}
