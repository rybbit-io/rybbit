import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { appendVary, markdownProxyTarget, preferredType } from "./lib/content-negotiation";

const internationalization = createMiddleware(routing);

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

  const response = internationalization(request);
  appendVary(response.headers, "Accept", "Accept-Encoding");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
