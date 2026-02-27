import type { Metadata } from 'next';
import type { Page } from '@/lib/source';

export function getPageImage(page: Page) {
  return {
    url: `/og/${page.slugs.join('/')}/image.png`,
    width: 1200,
    height: 630,
  };
}

export function createOGImageUrl(title: string, description?: string) {
  const params = new URLSearchParams({ title });
  if (description) params.set('description', description);
  return {
    url: `/og-image?${params.toString()}`,
    width: 1200,
    height: 630,
  };
}

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      siteName: 'Rybbit',
      type: 'article',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@yang_frog',
      ...override.twitter,
    },
  };
}
