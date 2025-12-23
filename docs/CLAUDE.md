# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Dev: `npm run dev` (Next.js with Turbopack on port 3003)
- Build: `npm run build`
- Production: `npm start`
- Type Check: `tsc --noEmit`
- Content Processing: `fumadocs-mdx` (runs automatically on postinstall)

## Project Overview

This is the documentation and marketing website for Rybbit, built with Next.js 16 and Fumadocs. The site includes:

- Documentation pages (using Fumadocs MDX)
- Blog (separate content collection)
- Marketing pages (home, pricing, features, comparison pages)
- Analytics tools (SEO, ROI calculators, privacy policy builder, etc.)
- LLM-friendly documentation endpoints
- The domain is rybbit.com

## Code Architecture

### Content Management

- **Fumadocs MDX**: Documentation system using `fumadocs-mdx` for MDX processing
- **Source Configuration**: `source.config.ts` defines two content collections:
  - `docs`: Documentation pages in `content/docs/`
  - `blog`: Blog posts in `content/blog/` with extended frontmatter (date, author, image, tags)
- **Source Adapters**:
  - `src/lib/source.ts`: Docs source loader (base URL: `/docs`)
  - `src/lib/blog-source.ts`: Blog source loader (base URL: `/blog`)
- **Auto-generated**: `.source/` directory contains generated TypeScript from MDX files

### Route Structure

- `app/(home)/*`: Marketing pages (landing, pricing, features, comparison pages, tools)
- `app/docs/[[...slug]]/`: Documentation pages using catch-all routing
- `app/blog/`: Blog listing and individual posts
- `app/api/search/`: Documentation search powered by Orama
- `app/api/tools/`: API endpoints for tool functionality (SEO generators, analytics detector, etc.)
- `app/llms.mdx/` and `app/llms-full.txt/`: LLM-optimized documentation endpoints

### Key Components

- **Layout**: `app/layout.config.tsx` defines shared navigation and links for Fumadocs
- **Tools**: Various analytics and SEO tools in `app/(home)/tools/` with form components and API routes
- **Cards**: Feature demonstration components in `src/components/Cards/`
- **UI Components**: Radix UI-based components in `src/components/ui/`

### External Integrations

- **OpenRouter**: LLM API integration via `src/lib/openrouter.ts` for tool functionality
  - Uses `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` environment variables
  - Model: `z-ai/glm-4.6` (configurable)
- **Search**: Fumadocs search with Orama, English language support
- **Analytics**: Event tracking via `src/lib/trackAdEvent.ts`

### Path Aliases

- `@/*`: Maps to `src/*`
- `@/.source`: Maps to `.source/index.ts` (generated MDX content)

## Code Conventions

- TypeScript with strict mode enabled
- React 19 functional components
- Next.js App Router with route groups
- Fumadocs for documentation infrastructure
- Tailwind CSS v4 with dark mode support
- Path-based imports using `@/` alias
- MDX components defined in `src/mdx-components.tsx`

## Important Notes

- Content files in `content/docs/` and `content/blog/` are processed by Fumadocs MDX
- The `.source/` directory is auto-generated and should not be edited manually
- Next.js rewrites map `/docs/:path*.mdx` to `/llms.mdx/:path*` for LLM consumption
- Remote images allowed from: pbs.twimg.com, abs.twimg.com, ui-avatars.com, cdn.outrank.so, www.google.com
