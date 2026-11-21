import { adminClient, organizationClient, emailOTPClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";
import { createAuthClient } from "better-auth/react";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

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
  // Role on those sites (editor, member or viewer); absent means the invited role.
  siteRole: {
    type: "string" as const,
    // Literal, so the invite input types the field as optional.
    required: false as const,
  },
};

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  plugins: [
    adminClient(),
    organizationClient({
      teams: {
        enabled: true,
      },
      schema: {
        invitation: {
          additionalFields: invitationSiteAccessFields,
        },
      },
    }),
    emailOTPClient(),
    apiKeyClient(),
    oauthProviderClient(),
  ],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ["google", "github", "twitter"],
});
