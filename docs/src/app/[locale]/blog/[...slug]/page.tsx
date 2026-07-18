import { notFound } from "next/navigation";
import { blogSource } from "@/lib/blog-source";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Pre } from "fumadocs-ui/components/codeblock";
import Script from "next/script";
import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import { createOGImageUrl } from "@/lib/metadata";

export function generateStaticParams() {
  return blogSource.getPages().map(page => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  const page = blogSource.getPage(params.slug);
  if (!page) return {};

  const url = `https://rybbit.com/blog/${params.slug.join("/")}`;
  const publishedTime = page.data.date ? new Date(page.data.date).toISOString() : undefined;
  const ogImage =
    page.data.image || createOGImageUrl(page.data.title, page.data.description, "Blog").url;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: "article",
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
      siteName: "Rybbit",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: [ogImage],
      creator: "@rybbitio",
    },
    keywords: page.data.tags
      ? [...page.data.tags, "web analytics", "privacy analytics", "Rybbit"]
      : ["web analytics", "privacy analytics", "Rybbit"],
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
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: page.data.title,
    description: page.data.description,
    datePublished: date?.toISOString(),
    dateModified: date?.toISOString(),
    author: {
      "@type": "Person",
      name: page.data.author || "Rybbit Team",
    },
    publisher: {
      "@type": "Organization",
      name: "Rybbit",
      logo: {
        "@type": "ImageObject",
        url: "https://rybbit.com/public/rybbit.svg",
      },
    },
    keywords: page.data.tags?.join(", "),
  };

  return (
    <div className="overflow-x-clip">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <article>
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800 lg:grid lg:grid-cols-12">
            <GridCrosses />

            <div className="border-b border-neutral-200 px-5 pb-10 pt-8 dark:border-neutral-800 sm:px-8 lg:col-span-8 lg:border-b-0 lg:border-r lg:px-10 lg:pb-16 lg:pt-10">
              <Link
                href="/blog"
                className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-neutral-600 transition-colors duration-200 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:text-neutral-400 dark:hover:text-white"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Back to Blog
              </Link>

              <h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.035em] text-neutral-950 text-balance dark:text-neutral-50 md:text-5xl">
                {page.data.title}
              </h1>

              {page.data.description && (
                <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600 text-pretty dark:text-neutral-400">
                  {page.data.description}
                </p>
              )}
            </div>

            <div className="flex flex-col justify-end gap-6 px-5 py-8 text-sm sm:px-8 lg:col-span-4 lg:px-10 lg:py-10">
              {(date || page.data.author) && (
                <dl className="grid grid-cols-2 gap-6">
                  {date && (
                    <div>
                      <dt className="font-medium text-neutral-500 dark:text-neutral-400">Published</dt>
                      <dd className="mt-1 text-neutral-950 tabular-nums dark:text-neutral-50">
                        <time dateTime={date.toISOString()}>
                          {date.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                      </dd>
                    </div>
                  )}
                  {page.data.author && (
                    <div>
                      <dt className="font-medium text-neutral-500 dark:text-neutral-400">Written by</dt>
                      <dd className="mt-1 text-neutral-950 dark:text-neutral-50">{page.data.author}</dd>
                    </div>
                  )}
                </dl>
              )}

              {page.data.tags && page.data.tags.length > 0 && (
                <div>
                  <h2 className="sr-only">Tags</h2>
                  <ul className="flex flex-wrap gap-2">
                    {page.data.tags.map((tag: string) => (
                      <li
                        key={tag}
                        className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
            {page.data.image && (
              <div className="border-b border-neutral-200 dark:border-neutral-800">
                <Image
                  src={page.data.image}
                  alt={page.data.title}
                  width={1200}
                  height={400}
                  className="h-auto w-full object-cover"
                />
              </div>
            )}

            <div className="px-5 py-10 sm:px-8 md:py-14 lg:px-10">
              <div
                className="prose prose-neutral max-w-3xl dark:prose-invert prose-headings:tracking-tight prose-a:text-emerald-700 prose-a:decoration-emerald-700/30 hover:prose-a:decoration-current dark:prose-a:text-emerald-400 dark:prose-a:decoration-emerald-400/30
              prose-code:before:content-none prose-code:after:content-none
              [&_pre]:my-4 [&_pre]:overflow-x-auto"
              >
                <MDXContent
                  components={{
                    ...defaultMdxComponents,
                    pre: (props: React.ComponentPropsWithoutRef<"pre">) => (
                      <Pre
                        {...props}
                        className="rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
                      />
                    ),
                    code: ({ className, ...props }: React.ComponentPropsWithoutRef<"code">) => {
                      // Check if this code is inside a pre tag (code block)
                      const isCodeBlock = className?.includes("language-");
                      if (isCodeBlock) {
                        return <code className={className} {...props} />;
                      }
                      // Inline code
                      return (
                        <code
                          className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-neutral-900"
                          {...props}
                        />
                      );
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </article>

      <CTASection eventLocation="blog_post_cta" />
    </div>
  );
}
