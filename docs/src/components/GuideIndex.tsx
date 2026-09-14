import * as simpleIcons from '@icons-pack/react-simple-icons';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { getLocale } from 'next-intl/server';
import { createElement, type ComponentType } from 'react';
import categories from '@/lib/guide-categories.json';
import { source } from '@/lib/source';

type GuidePage = {
  url: string;
  slugs: string[];
  data: { title: string; description?: string; category?: string; icon?: string };
};

function brandIcon(name?: string) {
  if (!name || !(name in simpleIcons)) return undefined;
  const Icon = simpleIcons[name as keyof typeof simpleIcons] as ComponentType<{ className?: string }>;
  return createElement(Icon, { className: 'size-4' });
}

/**
 * Grid of every integration guide, grouped by the `category` frontmatter
 * field in the order defined by src/lib/guide-categories.json. Rendered from
 * content/docs/(docs)/guides/index.mdx so the index never goes stale.
 */
export async function GuideIndex() {
  const locale = await getLocale();
  const pages = (source.getPages(locale) as GuidePage[]).filter(
    p => p.slugs[0] === 'guides' && p.slugs.length > 1,
  );

  return (
    <>
      {categories.map(({ key, label }) => {
        const group = pages
          .filter(p => p.data.category === key)
          .sort((a, b) => a.data.title.localeCompare(b.data.title));
        if (group.length === 0) return null;
        return (
          <section key={key}>
            <h2 id={key}>{label}</h2>
            <Cards>
              {group.map(p => (
                <Card key={p.url} href={p.url} title={p.data.title} icon={brandIcon(p.data.icon)} />
              ))}
            </Cards>
          </section>
        );
      })}
    </>
  );
}
