import { docs, meta } from '@/.source';
import { InferPageType, loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx/runtime/next';
import { i18n } from './i18n';

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
  i18n,
  // it assigns a URL to your pages
  baseUrl: '/docs',
  source: createMDXSource(docs, meta),
});

export type Page = InferPageType<typeof source>;
