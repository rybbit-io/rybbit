"use client";

// This is a simple fallback page that should never be seen
// All redirects should be handled by the middleware
export default function SiteRedirect() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4">Redirecting...</p>
      </div>
    </div>
  );
}
