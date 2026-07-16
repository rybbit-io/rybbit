# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Dev: `npm run dev` (Next.js with Turbopack on port 3003)
- Build: `npm run build`
- Production: `npm start`
- Type Check: `tsc --noEmit`
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

### Internationalization (i18n)

- **Library**: `next-intl` v4 with experimental extract mode enabled
- **Supported Locales**: `en` (default), `de`, `fr`, `zh`, `es`, `pl`, `it`, `ko`, `pt`, `ja`
- **Message Files**: `messages/{locale}.json` — one JSON file per locale with ~242 keys
- **Config Files** in `src/i18n/`:
  - `routing.ts`: Locale list and prefix strategy (`as-needed` — no prefix for default `en`)
  - `request.ts`: Server-side locale resolution with fallback to `en`
  - `navigation.ts`: Locale-aware `Link`, `redirect`, `usePathname`, `useRouter` exports
- **Middleware**: `src/proxy.ts` uses `next-intl/middleware` for automatic locale detection from URL or `Accept-Language` header
- **URL Structure**: Default locale has no prefix (`/pricing`); others are prefixed (`/fr/pricing`)
- **Fumadocs i18n**: `src/lib/i18n.ts` configures the Fumadocs doc tree with the same locales
- **Usage in components**: `const t = useExtracted()` from `next-intl`, then `t("key")` or `t("Welcome {name}", { name })`
- **Language Switcher**: `src/components/LanguageSwitcher.tsx` — client component dropdown for all 10 locales
- **Adding translations**: Add keys to `messages/en.json`, then run `npm run extract` to sync all locale files
- **Automated translation**: `.github/workflows/translate-docs.yml` detects untranslated strings on push to master and opens a PR with AI-generated translations

### Path Aliases

- `@/*`: Maps to `src/*`
- `@/.source`: Maps to `.source/index.ts` (generated MDX content)

## Code Conventions

- Fumadocs for documentation infrastructure; MDX components defined in `src/mdx-components.tsx`
- Tailwind CSS v4 with dark mode support

## Important Notes

- Content files in `content/docs/` and `content/blog/` are processed by Fumadocs MDX
- The `.source/` directory is auto-generated and should not be edited manually
- Next.js rewrites map `/docs/:path*.mdx` to `/llms.mdx/:path*` for LLM consumption
- Remote images allowed from: pbs.twimg.com, abs.twimg.com, ui-avatars.com, cdn.outrank.so, www.google.com
