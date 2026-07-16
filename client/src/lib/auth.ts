import { adminClient, organizationClient, emailOTPClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client"
import { createAuthClient } from "better-auth/react";

const invitationSiteAccessFields = {
  hasRestrictedSiteAccess: {
    type: "boolean" as const,
    required: false,
    defaultValue: false,
  },
  siteIds: {
    type: "number[]" as const,
    required: false,
    defaultValue: [] as number[],
  },
};

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  plugins: [adminClient(), organizationClient({
    teams: {
      enabled: true,
    },
    schema: {
      invitation: {
        additionalFields: invitationSiteAccessFields,
      },
    },
  }), emailOTPClient(), apiKeyClient()],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ["google", "github", "twitter"],
});
