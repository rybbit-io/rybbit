import { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { blogSource } from "@/lib/blog-source";
import { readdirSync } from "fs";
import { join } from "path";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://rybbit.com";

  // Get all documentation pages
  const docPages = source.getPages().map(page => ({
    url: `${baseUrl}/docs/${page.slugs.join("/")}`,
    lastModified: page.data.lastModified || new Date(),
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

  // Dynamically get tool slugs from the tools directory
  const toolsPath = join(process.cwd(), "src/app/[locale]/(home)/tools");
  const toolSlugs = readdirSync(toolsPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== "components")
    .map(dirent => dirent.name);

  const toolPages = toolSlugs.map(slug => ({
    url: `${baseUrl}/tools/${slug}`,
    lastModified: new Date("2025-11-23"),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
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
    },
  ];

  return [...staticPages, ...toolPages, ...docPages, ...blogPosts];
}
