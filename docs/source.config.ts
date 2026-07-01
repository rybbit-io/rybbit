import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
  docs: {
    // `method` powers the HTTP verb badge shown next to API endpoints in the sidebar
    schema: frontmatterSchema.extend({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

// Blog collection - separate from docs
export const blog = defineDocs({
  dir: 'content/blog',
  docs: {
    schema: frontmatterSchema.extend({
      date: z.string().date().or(z.date()),
      author: z.string().optional(),
      image: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  },
});

export default defineConfig();
