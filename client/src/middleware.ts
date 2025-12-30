import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Skip redirects for static files (favicon.ico, images, etc.)
  if (path.includes(".")) {
    return NextResponse.next();
  }

  // Handle GitHub OAuth callback redirect
  if (path.includes("/auth/callback/github") || path.includes("/auth/callback/google")) {
    const redirectUrl = new URL(`/api${path}${request.nextUrl.search}`, request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  // Check if we're on a site route without a specific page
  // This matches exactly /{siteId} with nothing after it
  const siteRoutePattern = /^\/([^/]+)$/;
  const match = path.match(siteRoutePattern);

  if (match) {
    const siteId = match[1];

    // Don't redirect certain built-in routes like 'login', 'signup', etc.
    const excludedRoutes = [
      "login",
      "signup",
      "subscribe",
      "invitation",
      "reset-password",
      "auth",
      "admin",
      "organization",
      "account",
      "uptime",
      "settings",
      "as",
      "_next",
      "api",
    ];
    if (excludedRoutes.includes(siteId)) {
      return NextResponse.next();
    }

    // Add cache control headers to make sure the redirect isn't cached
    const response = NextResponse.redirect(new URL(`/${siteId}/main`, request.url));
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  // Check if we're on a site route with a private key: /{siteId}/{privateKey}
  const privateKeyRoutePattern = /^\/([^/]+\/[a-f0-9]{12})$/i;
  const privateKeyMatch = path.match(privateKeyRoutePattern);

  if (privateKeyMatch) {
    const siteAndKey = privateKeyMatch[1]; // e.g., "123/abc123def456"

    // Redirect to /main while preserving the private key in the path
    const response = NextResponse.redirect(new URL(`/${siteAndKey}/main`, request.url));
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  return NextResponse.next();
}

// Only run middleware on specific paths, exclude asset paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
