import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../server/src/trpc/router";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    // In the browser, use the backend URL
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
  }
  // On server, use the backend URL
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
}

export const trpc = createTRPCReact<AppRouter>();

export function getTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers() {
          return {
            // Include credentials for auth
          };
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
