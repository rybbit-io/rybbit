import { adminClient, organizationClient, emailOTPClient, apiKeyClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Helper function to get the backend URL dynamically
const getAuthBaseURL = () => {
  // For server-side rendering or build time, use the environment variable
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "";
  }

  // For client-side, use the current origin to support multiple domains
  // This allows the same instance to be accessed from different domains
  return window.location.origin;
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  plugins: [adminClient(), organizationClient(), emailOTPClient(), apiKeyClient()],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ["google", "github", "twitter"],
});
