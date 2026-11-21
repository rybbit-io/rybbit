# Adding Tools to Rybbit Docs (AI Agent Guide)

## Structure

All tools use `ToolPageLayout` with 6 sections: Header, Tool, Educational Content, FAQ, Related Tools, CTA.

## File Structure

```
/docs/src/app/(home)/tools/your-tool-name/
  YourToolForm.tsx  # Client component with tool logic
  page.tsx          # Page using ToolPageLayout
```

## Required ToolPageLayout Props

- `toolSlug`: URL identifier matching directory name
- `title`: Page title
- `description`: Brief description
- `toolComponent`: `<YourToolForm />`
- `educationalContent`: JSX with h2 sections (What is X?, How to Use, Best Practices)
- `faqs`: Array of `{question, answer}` (4-6 items, answer can be JSX)
- `relatedToolsCategory`: `"analytics" | "seo" | "privacy" | "social-media"`
- `ctaTitle`, `ctaDescription`, `ctaEventLocation`: CTA section

## Optional Props

- `badge`: `"Free Tool"` (default) or `"AI-Powered Tool"`
- `ctaButtonText`: Default `"Start tracking for free"`
- `structuredData`: JSON-LD object

## Styling

- Primary: `bg-emerald-600 hover:bg-emerald-500`
- Success: `bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800`
- Error: `bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`
- Backgrounds: `bg-white dark:bg-neutral-900`
- Borders: `border-neutral-200 dark:border-neutral-800`
- Text: `text-neutral-900 dark:text-white` (headings), `text-neutral-700 dark:text-neutral-300` (body)

## CRITICAL Rules

1. **NO manual bullets** (`•`) in lists - component auto-styles them
2. Tool slug MUST match directory name
3. Educational content: h2 for sections, no h1
4. Keep metadata title <60 chars, description 150-160 chars
5. Include Rybbit integration in FAQs when relevant

## Common Patterns

```tsx
// Loading
const [isLoading, setIsLoading] = useState(false);
<button disabled={isLoading}>{isLoading ? "Processing..." : "Calculate"}</button>;

// Error
const [error, setError] = useState<string | null>(null);
{
  error && <div className="p-4 bg-red-50...">{error}</div>;
}

// Copy
await navigator.clipboard.writeText(result);
```

## API Routes (if needed)

Path: `/docs/src/app/api/tools/your-tool-name/route.ts`

- Use POST, validate with Zod, return JSON

---

# Multi-Platform Tools (Same Tool, Multiple Platforms)

For tools that are identical across platforms but with different branding (e.g., font generators for LinkedIn, Discord, X, etc.), use the **dynamic route pattern** to minimize duplication.

## Recommended Structure (Dynamic Route)

```
/docs/src/app/(home)/tools/
  components/
    ToolPageLayout.tsx         # Shared layout (used by all tools)
    ToolCTA.tsx                # Shared CTA component
  (social-media-tools)/        # Route group (parentheses = hidden from URL)
    components/
      YourToolComponent.tsx    # Tool-specific components
      platform-configs.ts      # Platform metadata
    [slug]/                    # Dynamic route
      page.tsx                 # Single page for all platforms
```

**Example:** Social media tools (font generators, bio generators, etc.)

```
/tools/
  components/
    ToolPageLayout.tsx         # Shared by ALL tools
    ToolCTA.tsx
  (social-media-tools)/        # Route group
    components/
      FontGeneratorTool.tsx    # Font transformation logic
      BioGenerator.tsx         # Bio generation logic
      platform-configs.ts      # Platform configs for each tool type
    [slug]/
      page.tsx                 # Generates all platform routes at build time
```

## Step-by-Step

### 1. Create Shared Tool Component

```tsx
// (social-media-tools)/components/YourToolComponent.tsx
"use client";

interface YourToolProps {
  platformName?: string;
  platformSpecificOption?: string;
}

export function YourTool({ platformName, platformSpecificOption }: YourToolProps) {
  // Your tool logic here
  return <div>Tool UI for {platformName}</div>;
}
```

### 2. Create Platform Config

```tsx
// (social-media-tools)/components/platform-configs.ts
export interface PlatformConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  educationalContent: string;
  // Add platform-specific fields
}

export const platformConfigs: Record<string, PlatformConfig> = {
  platform1: {
    id: "platform1",
    name: "Platform One",
    displayName: "Platform One Tool Name",
    description: "Tool description for Platform One",
    educationalContent: "How this tool works on Platform One...",
  },
  platform2: {
    id: "platform2",
    name: "Platform Two",
    displayName: "Platform Two Tool Name",
    description: "Tool description for Platform Two",
    educationalContent: "How this tool works on Platform Two...",
  },
};

export const platformList = Object.values(platformConfigs);
```

### 3. Create Dynamic Route Page

Create a **single** dynamic route that handles all platforms:

```tsx
// (social-media-tools)/[slug]/page.tsx
import { ToolPageLayout } from "../../components/ToolPageLayout";
import { YourTool } from "../components/YourToolComponent";
import { platformConfigs, platformList } from "../components/platform-configs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate static params for all platforms at build time
export async function generateStaticParams() {
  return platformList.map(platform => ({
    slug: `${platform.id}-tool-name`,
  }));
}

// Generate metadata dynamically based on slug
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const platformId = slug.replace("-tool-name", "");
  const platform = platformConfigs[platformId];

  if (!platform) {
    return { title: "Tool Not Found" };
  }

  return {
    title: `Free ${platform.displayName} | Description`,
    description: platform.description,
    openGraph: {
      title: `Free ${platform.displayName}`,
      description: platform.description,
      type: "website",
      url: `https://yourdomain.com/tools/${slug}`,
    },
    // ... rest of metadata
  };
}

// Render the page
export default async function PlatformToolPage({ params }: PageProps) {
  const { slug } = await params;
  const platformId = slug.replace("-tool-name", "");
  const platform = platformConfigs[platformId];

  if (!platform) {
    notFound();
  }

  const educationalContent = (
    <>
      <h2 className="text-2xl font-bold mb-4">About {platform.name}</h2>
      <p className="text-neutral-700 dark:text-neutral-300">
        {platform.educationalContent}
      </p>
    </>
  );

  return (
    <ToolPageLayout
      toolSlug={slug}
      title={platform.displayName}
      description={platform.description}
      toolComponent={<YourTool platformName={platform.name} />}
      educationalContent={educationalContent}
      faqs={[]}
      relatedToolsCategory="your-category"
      ctaTitle="CTA for this tool category"
      ctaDescription="CTA description"
      ctaEventLocation={`${platform.id}_tool_cta`}
    />
  );
}
```

### 4. Register Tools

**Main tools page:**

```tsx
// page.tsx
import { platformList } from "./(social-media-tools)/components/platform-configs";

const yourTools = platformList.map(platform => ({
  href: `/tools/${platform.id}-tool-name`,
  icon: YourIcon,
  title: platform.displayName,
  description: platform.description,
}));
```

**Related tools:**

```tsx
// src/components/RelatedTools.tsx
const allTools: Tool[] = [
  // ... existing tools
  ...platformList.map(platform => ({
    name: platform.displayName,
    description: platform.description,
    href: `/tools/${platform.id}-tool-name`,
    category: "your-category",
  })),
];
```

## Key Points

**Dynamic Route Pattern:**
- The `[slug]` directory creates a dynamic route where slug = full route name (e.g., "linkedin-tool-name")
- `generateStaticParams()` tells Next.js to generate static pages for all platforms at build time
- Parse the slug to extract the platform ID: `slug.replace("-tool-name", "")`
- Next.js 15+ requires awaiting `params`: `const { slug } = await params`

**Route Groups:**
- `(social-media-tools)/` organizes files without affecting URLs
- URLs remain `/tools/platform-tool-name` (route group doesn't appear)

**Next.js Limitations:**
- ❌ `[platform]-tool-name/` doesn't work (Next.js doesn't support `[param]-literal` patterns)
- ✅ `[slug]/` where slug includes the suffix works perfectly

## Benefits

- **90% less code:** 1 file instead of N duplicate files
- **Single source of truth:** All logic in one place
- **Same SEO:** Each platform gets unique URL, title, description, metadata
- **Easy to add platforms:** Just add to config and rebuild
- **Type-safe:** TypeScript ensures platform config consistency
- **Route group keeps `/tools/` clean**

## When to Use This Pattern

✅ **Use dynamic route for:**

- Same tool logic, different platform branding (font generators, link builders, etc.)
- Tools with 5+ platform variants
- Tools where platforms only differ in metadata/content
- You want minimal code duplication

❌ **Don't use for:**

- Tools with platform-specific logic that can't be shared
- One-off tools
- Tools with <3 platform variants (just duplicate the page - simpler)
