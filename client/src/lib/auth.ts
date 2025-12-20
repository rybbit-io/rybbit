import { adminClient, organizationClient, emailOTPClient, apiKeyClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Use internal backend URL for SSR, external URL for client
const getBaseURL = () => {
  // Server-side (SSR)
  if (typeof window === "undefined") {
    const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!url) {
      throw new Error(
        "Missing required environment variable: BACKEND_URL or NEXT_PUBLIC_BACKEND_URL must be set for SSR authentication"
      );
    }
    return url;
  }
  // Client-side
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_BACKEND_URL must be set for client-side authentication"
    );
  }
  return url;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [adminClient(), organizationClient(), emailOTPClient(), apiKeyClient()],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ["google", "github", "twitter"],
});
