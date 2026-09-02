import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { appendVary, markdownProxyTarget, preferredType } from "./lib/content-negotiation";
import {
  HOME_VARIANT_B_PATH,
  HOME_VARIANT_COOKIE,
  HOME_VARIANT_MAX_AGE,
  type HomeVariant,
  isCrawler,
  isHomeVariant,
} from "./lib/landing-experiment";

const internationalization = createMiddleware(routing);

/**
 * Homepage experiment arm for this request: the remembered one, or a fresh
 * 50/50 draw that the caller persists. Crawlers are never enrolled.
 */
function resolveHomeVariant(request: NextRequest): { variant: HomeVariant; assigned: boolean } | null {
  if (isCrawler(request.headers.get("user-agent"))) return null;
  const existing = request.cookies.get(HOME_VARIANT_COOKIE)?.value;
  if (isHomeVariant(existing)) return { variant: existing, assigned: false };
  return { variant: Math.random() < 0.5 ? "a" : "b", assigned: true };
}

export default function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return internationalization(request);
  }

  const accept = request.headers.get("Accept");
  const representation = preferredType(accept);

  if (representation === "text/markdown") {
    const { rewriteUrl, requestHeaders } = markdownProxyTarget(request.url, request.headers);

    const response = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    appendVary(response.headers, "Accept", "Accept-Encoding");
    return response;
  }

  if (representation === null && accept) {
    return new Response("Not Acceptable\n\nAvailable representations: text/html, text/markdown\n", {
      status: 406,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Vary: "Accept, Accept-Encoding",
      },
    });
  }

  // Homepage experiment: variant B visitors get the redesign served at `/`.
  // Only the bare default-locale homepage takes part; the i18n middleware
  // still handles the rewritten path (→ /en/lp/b) so the URL never changes.
  const experiment = resolveHomeVariant(request);
  const servesVariantB = experiment?.variant === "b" && request.nextUrl.pathname === "/";
  if (servesVariantB) {
    request.nextUrl.pathname = HOME_VARIANT_B_PATH;
  }

  const response = internationalization(request);
  appendVary(response.headers, "Accept", "Accept-Encoding");
  if (experiment?.assigned) {
    response.cookies.set(HOME_VARIANT_COOKIE, experiment.variant, {
      path: "/",
      maxAge: HOME_VARIANT_MAX_AGE,
      sameSite: "lax",
    });
  }
  if (servesVariantB) {
    // Don't advertise the internal /lp/b path as this page's alternates.
    response.headers.delete("Link");
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
