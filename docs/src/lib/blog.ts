import { blogSource } from "@/lib/blog-source";
import { createOGImageUrl } from "@/lib/metadata";

export type BlogPost = ReturnType<typeof blogSource.getPages>[number];

const WORDS_PER_MINUTE = 220;

/** Reading time in whole minutes, derived from the indexed body text. */
export function readingTimeMinutes(post: BlogPost): number {
  const { structuredData } = post.data;
  const text = [
    ...structuredData.headings.map(h => h.content),
    ...structuredData.contents.map(c => c.content),
  ].join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function wordCount(post: BlogPost): number {
  const { structuredData } = post.data;
  return structuredData.contents.map(c => c.content).join(" ").split(/\s+/).filter(Boolean).length;
}

/**
 * Cover image for a post. Falls back to the generated OG card so every post
 * has a thumbnail on the index and in schema even before a real cover exists.
 */
export function postImageUrl(post: BlogPost): string {
  return post.data.image || createOGImageUrl(post.data.title, post.data.description, "Blog").url;
}

export function isGeneratedImage(url: string): boolean {
  return url.startsWith("/og/");
}

export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `https://rybbit.com${path}`;
}

/** Newest first. */
export function sortedPosts(): BlogPost[] {
  return [...blogSource.getPages()].sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  );
}

/** Posts sharing the most tags with `current`, newest first as a tie-break. */
export function relatedPosts(current: BlogPost, limit = 3): BlogPost[] {
  const tags = new Set(current.data.tags ?? []);
  return sortedPosts()
    .filter(post => post.url !== current.url)
    .map((post, index) => ({
      post,
      shared: (post.data.tags ?? []).filter(tag => tags.has(tag)).length,
      index,
    }))
    .sort((a, b) => b.shared - a.shared || a.index - b.index)
    .slice(0, limit)
    .map(entry => entry.post);
}
