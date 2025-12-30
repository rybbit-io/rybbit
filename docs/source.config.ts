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
