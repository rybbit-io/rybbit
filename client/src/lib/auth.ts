import { adminClient, organizationClient, emailOTPClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client"
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  plugins: [adminClient(), organizationClient({
    teams: {
      enabled: true,
    },
  }), emailOTPClient(), apiKeyClient()],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ["google", "github", "twitter"],
});
