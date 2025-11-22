import { adminClient, organizationClient, emailOTPClient, apiKeyClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

//TODO: Load socialProviders from configs, but we can't use hooks here
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  plugins: [adminClient(), organizationClient(), emailOTPClient(), apiKeyClient(), genericOAuthClient()],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ['google', 'github'],
});
