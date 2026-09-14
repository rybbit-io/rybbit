import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://rybbit.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/openapi.json", "/api/openapi.json", "/llms.txt", "/llms-full.txt", "/sitemap.xml"],
        disallow: [
          "/api/",
          "/_next/",
          "/static/",
          "/*.json$",
          "/*?*", // URLs with query parameters
          "/404",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
