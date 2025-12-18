import { adminClient, organizationClient, emailOTPClient, apiKeyClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Use internal backend URL for SSR, external URL for client
const getBaseURL = () => {
  // Server-side (SSR)
  if (typeof window === "undefined") {
    return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  // Client-side
  return process.env.NEXT_PUBLIC_BACKEND_URL;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [adminClient(), organizationClient(), emailOTPClient(), apiKeyClient()],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ["google", "github", "twitter"],
});
