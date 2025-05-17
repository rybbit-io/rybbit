import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export async function getAllPosts() {
  const files = fs.readdirSync(BLOG_DIR);

  const posts = files
    .filter((file) => file.endsWith(".mdx") && !file.startsWith("_"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const filePath = path.join(BLOG_DIR, file);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);

      return {
        slug,
        frontMatter: {
          ...data,
          date: data.date ? new Date(data.date).toISOString() : null,
        },
      };
    })
    // Sort by date (newest first)
    .sort(
      (a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date)
    );

  return posts;
}

export async function getPostBySlug(slug) {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    frontMatter: {
      ...data,
      date: data.date ? new Date(data.date).toISOString() : null,
    },
    content,
    slug,
  };
}
