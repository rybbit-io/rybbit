import { notFound } from "next/navigation";
import { blogSource } from "@/lib/blog-source";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Pre } from "fumadocs-ui/components/codeblock";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import Script from "next/script";
import { CTASection } from "@/components/CTASection";
import { GridCrosses } from "@/components/GridCrosses";
import {
  absoluteUrl,
  isGeneratedImage,
  postImageUrl,
  readingTimeMinutes,
  relatedPosts,
  wordCount,
  type BlogPost,
} from "@/lib/blog";

export function generateStaticParams() {
  return blogSource.getPages().map(page => ({
    slug: page.slugs,
  }));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata(props: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const params = await props.params;
  const page = blogSource.getPage(params.slug);
  if (!page) return {};

  const url = `https://rybbit.com/blog/${params.slug.join("/")}`;
  const publishedTime = page.data.date ? new Date(page.data.date).toISOString() : undefined;
  const modifiedTime = page.data.updated ? new Date(page.data.updated).toISOString() : publishedTime;
  const ogImage = postImageUrl(page);

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
      modifiedTime,
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

const DefaultMdxImage = defaultMdxComponents.img;

/**
 * Markdown images get width/height (and a static import) from fumadocs' remark-image
 * plugin and go through next/image. Raw `<img>` tags in MDX arrive without
 * dimensions, so they render as a plain lazy-loaded image instead of throwing.
 */
function MdxImage(props: React.ComponentProps<typeof DefaultMdxImage>) {
  const { src, width, height } = props as { src?: unknown; width?: unknown; height?: unknown };
  if (typeof src === "string" && !(width && height)) {
    const { alt, ...rest } = props as React.ComponentProps<"img">;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ""} loading="lazy" decoding="async" {...rest} />;
  }
  return <DefaultMdxImage {...props} />;
}

function RelatedPostCard({ post }: { post: BlogPost }) {
  const image = postImageUrl(post);
  const date = post.data.date ? new Date(post.data.date) : null;
  return (
    <li className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800 md:border-b-0 md:border-r md:last:border-r-0">
      <Link
        href={`/blog/${post.slugs.join("/")}`}
        className="group flex h-full flex-col gap-4 px-5 py-6 transition-colors duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-neutral-900/40 sm:px-8 lg:px-10"
      >
        <Image
          src={image}
          alt=""
          width={1200}
          height={630}
          unoptimized={isGeneratedImage(image)}
          sizes="(max-width: 768px) 100vw, 380px"
          className="aspect-[1200/630] w-full rounded-md border border-neutral-200 object-cover dark:border-neutral-800"
        />
        <div className="flex flex-1 flex-col gap-2">
          {date && (
            <time dateTime={date.toISOString()} className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
              {formatDate(date)}
            </time>
          )}
          <h3 className="text-base font-semibold tracking-tight text-neutral-950 text-balance dark:text-neutral-50">
            {post.data.title}
          </h3>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Read the post
            <ArrowRight
              className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function BlogPostPage(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params;
  const page = blogSource.getPage(params.slug);

  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;
  const url = `https://rybbit.com/blog/${params.slug.join("/")}`;
  const date = page.data.date ? new Date(page.data.date) : null;
  const updated = page.data.updated ? new Date(page.data.updated) : null;
  const minutes = readingTimeMinutes(page);
  const related = relatedPosts(page, 3);
  const coverImage = postImageUrl(page);
  const authorName = page.data.author || "Rybbit Team";
  const isTeamAuthor = /rybbit/i.test(authorName);

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: page.data.title,
    description: page.data.description,
    image: [absoluteUrl(coverImage)],
    datePublished: date?.toISOString(),
    dateModified: (updated ?? date)?.toISOString(),
    author: isTeamAuthor
      ? { "@type": "Organization", name: "Rybbit", url: "https://rybbit.com" }
      : { "@type": "Person", name: authorName },
    publisher: {
      "@type": "Organization",
      name: "Rybbit",
      url: "https://rybbit.com",
      logo: {
        "@type": "ImageObject",
        url: "https://rybbit.com/rybbit/horizontal_black.png",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    wordCount: wordCount(page),
    timeRequired: `PT${minutes}M`,
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
              <dl className="grid grid-cols-2 gap-6">
                {date && (
                  <div>
                    <dt className="font-medium text-neutral-500 dark:text-neutral-400">Published</dt>
                    <dd className="mt-1 text-neutral-950 tabular-nums dark:text-neutral-50">
                      <time dateTime={date.toISOString()}>{formatDate(date)}</time>
                    </dd>
                  </div>
                )}

                {updated && (
                  <div>
                    <dt className="font-medium text-neutral-500 dark:text-neutral-400">Updated</dt>
                    <dd className="mt-1 text-neutral-950 tabular-nums dark:text-neutral-50">
                      <time dateTime={updated.toISOString()}>{formatDate(updated)}</time>
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="font-medium text-neutral-500 dark:text-neutral-400">Written by</dt>
                  <dd className="mt-1 text-neutral-950 dark:text-neutral-50">{authorName}</dd>
                </div>

                <div>
                  <dt className="font-medium text-neutral-500 dark:text-neutral-400">Reading time</dt>
                  <dd className="mt-1 text-neutral-950 tabular-nums dark:text-neutral-50">{minutes} min</dd>
                </div>
              </dl>

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
                  height={630}
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="h-auto w-full object-cover"
                />
              </div>
            )}

            <div className="px-5 py-10 sm:px-8 md:py-14 lg:px-10">
              {page.data.toc.length >= 3 && (
                <InlineTOC
                  items={page.data.toc}
                  defaultOpen
                  className="mb-8 max-w-3xl rounded-lg border border-neutral-200 dark:border-neutral-800"
                />
              )}

              <div
                className="prose prose-neutral max-w-3xl dark:prose-invert prose-headings:tracking-tight prose-a:text-emerald-700 prose-a:decoration-emerald-700/30 hover:prose-a:decoration-current dark:prose-a:text-emerald-400 dark:prose-a:decoration-emerald-400/30
              prose-code:before:content-none prose-code:after:content-none
              prose-img:rounded-lg prose-img:border prose-img:border-neutral-200 dark:prose-img:border-neutral-800
              [&_pre]:my-4 [&_pre]:overflow-x-auto"
              >
                <MDXContent
                  components={{
                    ...defaultMdxComponents,
                    img: MdxImage,
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

        {related.length > 0 && (
          <section
            aria-labelledby="related-posts"
            className="border-b border-neutral-200 dark:border-neutral-800"
          >
            <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
              <GridCrosses />
              <h2
                id="related-posts"
                className="border-b border-neutral-200 px-5 py-5 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:px-8 lg:px-10"
              >
                Keep reading
              </h2>
              <ul className="grid md:grid-cols-3">
                {related.map(post => (
                  <RelatedPostCard key={post.url} post={post} />
                ))}
              </ul>
            </div>
          </section>
        )}
      </article>

      <CTASection eventLocation="blog_post_cta" />
    </div>
  );
}
