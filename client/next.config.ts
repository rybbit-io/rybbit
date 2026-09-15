import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  experimental: {
    srcPath: "./src",
    extract: true,
    messages: {
      sourceLocale: "en",
      path: "./messages",
      format: "json",
      locales: ["en", "de", "fr", "zh", "es", "pl", "it", "ko", "pt", "ja", "cs", "uk"],
    },
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_DISABLE_SIGNUP: process.env.NEXT_PUBLIC_DISABLE_SIGNUP,
    NEXT_PUBLIC_LITE_DASHBOARD: process.env.NEXT_PUBLIC_LITE_DASHBOARD,
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
  // next dev only: /api is same-origin in real deploys (Caddy/nginx → backend).
  // Do not key this off NEXT_PUBLIC_BACKEND_URL — that env is optional.
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
