import { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { blogSource } from '@/lib/blog-source';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://docs.rybbit.io';
  
  // Get all documentation pages
  const docPages = source.getPages().map((page) => ({
    url: `${baseUrl}/docs/${page.slugs.join('/')}`,
    lastModified: page.data.lastModified || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Get all blog posts
  const blogPosts = blogSource.getPages().map((post) => ({
    url: `${baseUrl}/blog/${post.slugs.join('/')}`,
    lastModified: post.data.date || new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  return [...staticPages, ...docPages, ...blogPosts];
}