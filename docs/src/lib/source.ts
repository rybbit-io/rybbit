import { ApiSidebarLabel } from '@/components/ApiMethodBadge';
import { docs, meta } from '@/.source';
import { InferPageType, loader } from 'fumadocs-core/source';
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server';
import { icons } from 'lucide-react';
import { createElement } from 'react';
import { i18n } from './i18n';

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
  i18n,
  // it assigns a URL to your pages
  baseUrl: '/docs',
  // resolve string `icon` names from meta.json to lucide-react icons
  icon(icon) {
    if (icon && icon in icons) {
      return createElement(icons[icon as keyof typeof icons]);
    }
  },
  pageTree: {
    // Append an HTTP method badge to sidebar items whose page has a `method`
    // frontmatter field (the API endpoint pages).
    transformers: [
      {
        file(node, filePath) {
          if (!filePath) return node;
          const file = this.storage.read(filePath);
          const method =
            file?.format === 'page'
              ? (file.data as { method?: string }).method
              : undefined;
          if (method) {
            node.name = createElement(ApiSidebarLabel, {
              method,
              children: node.name,
            });
          }
          return node;
        },
      },
    ],
  },
  source: toFumadocsSource(docs, meta),
});

export type Page = InferPageType<typeof source>;
