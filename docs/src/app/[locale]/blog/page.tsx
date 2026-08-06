import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GridCrosses } from "@/components/GridCrosses";
import { InteriorPageHero } from "@/components/InteriorPageHero";
import { blogSource } from "@/lib/blog-source";

export const metadata: Metadata = {
  title: "Blog — Web Analytics, Privacy & Open Source",
  description:
    "Tutorials and insights from the Rybbit team on web analytics, Google Analytics alternatives, privacy-first tracking, and building in the open.",
  alternates: {
    canonical: "https://rybbit.com/blog",
  },
  openGraph: {
    title: "Rybbit Blog",
    description:
      "Tutorials and insights on web analytics, Google Analytics alternatives, privacy-first tracking, and building in the open.",
    type: "website",
    url: "https://rybbit.com/blog",
  },
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlogPage() {
  const posts = [...blogSource.getPages()];

  const sortedPosts = posts.sort((a, b) => {
    const dateA = new Date(a.data.date || 0);
    const dateB = new Date(b.data.date || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const [latest, ...rest] = sortedPosts;

  return (
    <div className="overflow-x-clip">
      <InteriorPageHero
        title="Blog"
        description="Updates, tutorials, and insights from the Rybbit team — on analytics, privacy, and building in the open."
        eventLocation="blog_hero"
        primaryAction={null}
        secondaryAction={null}
        note={null}
      />

      <section className="border-b border-neutral-200 dark:border-neutral-800" aria-label="Blog posts">
        <div className="relative mx-auto max-w-[1200px] border-x border-neutral-200 dark:border-neutral-800">
          <GridCrosses />

          {sortedPosts.length === 0 ? (
            <p className="px-5 py-16 text-neutral-600 dark:text-neutral-400 sm:px-8 lg:px-10">
              No blog posts yet. Check back soon!
            </p>
          ) : (
            <ol>
              {latest && (
                <li className="border-b border-neutral-200 dark:border-neutral-800">
                  <Link
                    href={`/blog/${latest.slugs.join("/")}`}
                    className="group relative block bg-plate-accent px-5 py-12 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:px-8 md:py-16 lg:px-10"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-graph-accent [mask-image:linear-gradient(to_bottom,black,transparent_92%),linear-gradient(to_left,transparent,black_40px)] [mask-composite:intersect]"
                    />
                    <article className="relative grid gap-6 lg:grid-cols-12 lg:gap-8">
                      <div className="flex flex-col justify-between gap-4 text-sm text-neutral-500 dark:text-neutral-400 lg:col-span-3">
                        <p className="flex items-center gap-2.5 font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
                          <span aria-hidden="true" className="size-2 rounded-[1px] bg-emerald-600 dark:bg-emerald-400" />
                          Latest post
                        </p>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:flex-col lg:gap-1.5">
                          {latest.data.date && (
                            <time dateTime={new Date(latest.data.date).toISOString()} className="tabular-nums">
                              {formatDate(new Date(latest.data.date))}
                            </time>
                          )}
                          {latest.data.author && <span>{latest.data.author}</span>}
                        </div>
                      </div>
                      <div className="lg:col-span-9">
                        <h2 className="max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 text-balance dark:text-neutral-50 md:text-4xl">
                          {latest.data.title}
                        </h2>
                        {latest.data.description && (
                          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 text-pretty dark:text-neutral-400">
                            {latest.data.description}
                          </p>
                        )}
                        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          Read the post
                          <ArrowRight
                            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                    </article>
                  </Link>
                </li>
              )}

              {rest.map(post => {
                const date = post.data.date ? new Date(post.data.date) : null;

                return (
                  <li
                    key={post.slugs.join("/")}
                    className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800"
                  >
                    <Link
                      href={`/blog/${post.slugs.join("/")}`}
                      className="group block px-5 py-8 transition-colors duration-200 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-neutral-900/40 sm:px-8 lg:px-10"
                    >
                      <article className="grid gap-2 lg:grid-cols-12 lg:gap-8">
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 lg:col-span-3">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:flex-col lg:gap-1.5">
                            {date && (
                              <time dateTime={date.toISOString()} className="tabular-nums">
                                {formatDate(date)}
                              </time>
                            )}
                            {post.data.author && <span>{post.data.author}</span>}
                          </div>
                        </div>
                        <div className="lg:col-span-8">
                          <h2 className="text-lg font-semibold tracking-tight text-neutral-950 text-balance dark:text-neutral-50">
                            {post.data.title}
                          </h2>
                          {post.data.description && (
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 text-pretty dark:text-neutral-400">
                              {post.data.description}
                            </p>
                          )}
                        </div>
                        <div className="hidden items-start justify-end lg:col-span-1 lg:flex">
                          <ArrowRight
                            className="mt-1.5 size-4 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-neutral-600"
                            aria-hidden="true"
                          />
                        </div>
                      </article>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
