import Link from "next/link";
import { blogSource } from "@/lib/blog-source";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest updates and insights from Rybbit",
};

export default function BlogPage() {
  const posts = [...blogSource.getPages()];

  // Sort posts by date (newest first)
  const sortedPosts = posts.sort((a, b) => {
    const dateA = new Date(a.data.date || 0);
    const dateB = new Date(b.data.date || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-xl text-neutral-400">Latest updates, tutorials, and insights from the Rybbit team</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {sortedPosts.map(post => {
          const date = post.data.date ? new Date(post.data.date) : null;

          return (
            <Link key={post.slugs.join("/")} href={`/blog/${post.slugs.join("/")}`} className="group">
              <article className="h-full bg-neutral-900 rounded-lg border border-neutral-800 p-6 hover:border-neutral-700 transition-all hover:-translate-y-1">
                {post.data.image && (
                  <img
                    src={post.data.image}
                    alt={post.data.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}

                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">
                    {post.data.title}
                  </h2>

                  {post.data.description && <p className="text-neutral-400 mb-4 flex-grow">{post.data.description}</p>}

                  <div className="flex items-center justify-between text-sm text-neutral-500">
                    {date && (
                      <time dateTime={date.toISOString()}>
                        {date.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    )}

                    {post.data.author && <span>{post.data.author}</span>}
                  </div>

                  {post.data.tags && post.data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.data.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-1 text-xs rounded-full bg-neutral-800 text-neutral-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {sortedPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-400">No blog posts yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
