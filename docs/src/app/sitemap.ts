import { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { blogSource } from "@/lib/blog-source";
import { socialMediaToolSlugs } from "@/app/[locale]/(home)/tools/(social-media-tools)/components/social-tool-slugs";
import { routing } from "@/i18n/routing";
import { readdirSync } from "fs";
import { join } from "path";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://rybbit.com";

  // hreflang alternates for routes whose content is actually localized
  // (rendered through translated templates). Docs/blog content is en-only and
  // non-en /tools pages are noindexed, so those routes get no alternates.
  const localeUrl = (locale: string, path: string) =>
    locale === routing.defaultLocale ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`;
  const localeAlternates = (path: string) => ({
    languages: {
      ...Object.fromEntries(routing.locales.map(locale => [locale, localeUrl(locale, path)])),
      "x-default": `${baseUrl}${path}`,
    },
  });

  // Get all documentation pages. getPages() without a language returns every
  // page once per locale under the same URL, so scope it to the default
  // locale; the docs index is skipped because /docs is already listed below.
  const docPages = source
    .getPages(routing.defaultLocale)
    .filter(page => page.slugs.length > 0)
    .map(page => ({
      url: `${baseUrl}/docs/${page.slugs.join("/")}`,
      lastModified: (page.data as { lastModified?: string | Date }).lastModified || new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // Get all blog posts
  const blogPosts = blogSource.getPages().map(post => ({
    url: `${baseUrl}/blog/${post.slugs.join("/")}`,
    lastModified: post.data.date || new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Standalone tool pages (one directory each); route groups like
  // (social-media-tools) are not routes and must be excluded.
  const toolsPath = join(process.cwd(), "src/app/[locale]/(home)/tools");
  const toolSlugs = readdirSync(toolsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== "components" && !dirent.name.startsWith("("))
    .map(dirent => dirent.name);

  const toolPages = [...toolSlugs, ...socialMediaToolSlugs].map(slug => ({
    url: `${baseUrl}/tools/${slug}`,
    lastModified: new Date("2025-11-23"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Feature pages
  const featuresPath = join(process.cwd(), "src/app/[locale]/(home)/features");
  const featureSlugs = readdirSync(featuresPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== "components")
    .map(dirent => dirent.name);

  const featurePages = [
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: localeAlternates("/features"),
    },
    ...featureSlugs.map(slug => ({
      url: `${baseUrl}/features/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: localeAlternates(`/features/${slug}`),
    })),
  ];

  // Comparison pages
  const competitors = [
    "google-analytics",
    "plausible",
    "posthog",
    "umami",
    "fathom",
    "simpleanalytics",
    "matomo",
    "cloudflare-analytics",
  ];
  const comparisonPages = [
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: localeAlternates("/compare"),
    },
    ...competitors.map(slug => ({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: localeAlternates(`/compare/${slug}`),
    })),
  ];

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
      alternates: localeAlternates(""),
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: localeAlternates("/pricing"),
    },
  ];

  // Legal / company pages
  const legalSlugs = ["privacy", "terms-and-conditions", "dpa", "security", "contact"];
  const legalPages = legalSlugs.map(slug => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  // Persona / solutions pages
  const personaSlugs = [
    "for-agencies",
    "white-label",
    "for-developers",
    "for-startups",
    "for-saas",
    "for-ecommerce",
    "for-small-business",
    "for-creators",
    "for-european-companies",
    "enterprise",
  ];
  const personaPages = personaSlugs.map(slug => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...staticPages,
    ...personaPages,
    ...featurePages,
    ...comparisonPages,
    ...toolPages,
    ...legalPages,
    ...docPages,
    ...blogPosts,
  ];
}
