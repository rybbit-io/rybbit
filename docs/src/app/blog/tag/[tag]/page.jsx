import Link from "next/link";
import { getAllPosts } from "../../../../lib/blog";

export async function generateStaticParams() {
  const posts = await getAllPosts();
  const tags = [
    ...new Set(posts.flatMap((post) => post.frontMatter.tags || [])),
  ];

  return tags.map((tag) => ({
    tag,
  }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;

  return {
    title: `Posts tagged with "${resolvedParams.tag}" - Rybbit`,
    description: `All blog posts tagged with ${resolvedParams.tag}`,
  };
}

export default async function TagPage({ params }) {
  const resolvedParams = await params;
  const { tag } = resolvedParams;

  const posts = await getAllPosts();
  const filteredPosts = posts.filter((post) =>
    post.frontMatter.tags?.includes(tag)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-block bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
          Topic
        </div>
        <h1 className="text-4xl font-bold mb-2">Posts tagged with "{tag}"</h1>
        <p className="text-neutral-300 max-w-2xl mx-auto">
          Articles and tutorials related to {tag}
        </p>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-neutral-300">No posts found with this tag.</p>
          <Link
            href="/blog"
            className="inline-block mt-4 text-emerald-400 hover:text-emerald-300 font-medium"
          >
            ← Back to all posts
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
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
                      {new Date(post.frontMatter.date).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </div>
                    <p className="text-neutral-300 mb-4 line-clamp-3">
                      {post.frontMatter.description}
                    </p>
                  </Link>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {post.frontMatter.tags?.map((postTag) => (
                      <Link
                        key={postTag}
                        href={`/blog/tag/${postTag}`}
                        className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                          postTag === tag
                            ? "bg-emerald-800/60 text-emerald-200 font-medium"
                            : "bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60"
                        }`}
                      >
                        {postTag}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Back to all posts
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
