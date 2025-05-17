import { getAllPosts } from "../../lib/blog";
import Link from "next/link";

export const metadata = {
  title: "Blog - Rybbit",
  description: "Latest news, tutorials, and updates from the Rybbit team",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-block bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
          Insights & Updates
        </div>
        <h1 className="text-4xl font-bold mb-2">Rybbit Blog</h1>
        <p className="text-neutral-300 max-w-2xl mx-auto">
          Latest news, tutorials, and insights about analytics and privacy
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.slug}
            className="relative bg-neutral-800/20 backdrop-blur-sm border border-neutral-700 rounded-xl overflow-hidden hover:border-neutral-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/10"
          >
            {/* Subtle gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-xl"></div>

            <div className="relative p-6">
              <Link href={`/blog/${post.slug}`} className="block">
                <h2 className="text-2xl font-semibold mb-2 text-white hover:text-emerald-400 transition-colors">
                  {post.frontMatter.title}
                </h2>
                <div className="text-neutral-400 mb-3 text-sm">
                  {new Date(post.frontMatter.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <p className="text-neutral-300 mb-4 line-clamp-3">
                  {post.frontMatter.description}
                </p>
              </Link>
              <div className="mt-4 flex gap-2 flex-wrap">
                {post.frontMatter.tags?.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${tag}`}
                    className="bg-emerald-900/40 text-emerald-400 text-xs px-2.5 py-1 rounded-full hover:bg-emerald-900/60 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
