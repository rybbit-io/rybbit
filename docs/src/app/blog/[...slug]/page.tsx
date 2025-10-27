import { notFound } from 'next/navigation';
import { blogSource } from '@/lib/blog-source';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Pre } from 'fumadocs-ui/components/codeblock';
import Script from 'next/script';

export function generateStaticParams() {
  return blogSource.getPages().map((page) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  const page = blogSource.getPage(params.slug);
  if (!page) return {};

  const url = `https://docs.rybbit.io/blog/${params.slug.join('/')}`;
  const publishedTime = page.data.date ? new Date(page.data.date).toISOString() : undefined;
  const ogImage = page.data.image || '/opengraph-image.png';

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: 'article',
      publishedTime,
      authors: page.data.author ? [page.data.author] : undefined,
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: page.data.title,
        },
      ],
      siteName: 'Rybbit',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: [ogImage],
      creator: '@rybbitio',
    },
    keywords: page.data.tags ? [...page.data.tags, 'web analytics', 'privacy analytics', 'Rybbit'] : ['web analytics', 'privacy analytics', 'Rybbit'],
    authors: page.data.author ? [{ name: page.data.author }] : undefined,
  };
}

export default async function BlogPostPage(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params;
  const page = blogSource.getPage(params.slug);
  
  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;
  const date = page.data.date ? new Date(page.data.date) : null;
  
  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: page.data.title,
    description: page.data.description,
    image: page.data.image || 'https://docs.rybbit.io/opengraph-image.png',
    datePublished: date?.toISOString(),
    dateModified: date?.toISOString(),
    author: {
      '@type': 'Person',
      name: page.data.author || 'Rybbit Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Rybbit',
      logo: {
        '@type': 'ImageObject',
        url: 'https://docs.rybbit.io/rybbit.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://docs.rybbit.io/blog/${params.slug.join('/')}`,
    },
    keywords: page.data.tags?.join(', '),
  };

  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article className="max-w-4xl mx-auto px-4 py-16">
      <Link 
        href="/blog" 
        className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-8"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Blog
      </Link>

      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          {page.data.title}
        </h1>
        
        {page.data.description && (
          <p className="text-xl text-neutral-400 mb-6">
            {page.data.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-neutral-500 pb-6 border-b border-neutral-800">
          {date && (
            <time dateTime={date.toISOString()}>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
          
          {page.data.author && (
            <>
              <span>•</span>
              <span>By {page.data.author}</span>
            </>
          )}

          {page.data.tags && page.data.tags.length > 0 && (
            <>
              <span>•</span>
              <div className="flex gap-2">
                {page.data.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-full bg-neutral-800 text-neutral-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {page.data.image && (
        <Image 
          src={page.data.image} 
          alt={page.data.title}
          width={1200}
          height={400}
          className="w-full h-96 object-cover rounded-lg mb-8"
        />
      )}

      <div className="prose prose-invert prose-lg max-w-none 
        prose-code:before:content-none prose-code:after:content-none
        [&_pre]:my-4 [&_pre]:overflow-x-auto">
        <MDXContent components={{
          ...defaultMdxComponents,
          pre: (props: React.ComponentPropsWithoutRef<'pre'>) => (
            <Pre {...props} className="bg-neutral-900 border border-neutral-800 rounded-lg" />
          ),
          code: ({ className, ...props }: React.ComponentPropsWithoutRef<'code'>) => {
            // Check if this code is inside a pre tag (code block)
            const isCodeBlock = className?.includes('language-');
            if (isCodeBlock) {
              return <code className={className} {...props} />;
            }
            // Inline code
            return <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-sm" {...props} />;
          },
        }} />
      </div>
    </article>
    </>
  );
}