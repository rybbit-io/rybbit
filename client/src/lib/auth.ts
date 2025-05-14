import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  plugins: [adminClient(), organizationClient()],
  fetchOptions: {
    credentials: "include",
  },
  socialProviders: ["google", "github", "twitter"],
});
