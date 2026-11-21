#!/usr/bin/env node
// Lint blog posts against the on-page checklist (see ops/seo/README.md).
// Usage: node scripts/check-blog.mjs [--strict] [content/blog/<slug>.mdx ...]
//   No file arguments lints every post. Errors always fail; warnings fail only with --strict.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const blogDir = join(root, "content/blog");
const publicDir = join(root, "public");

// The root layout's title template ("%s | Rybbit") is appended to every post title.
const TITLE_SUFFIX = " | Rybbit";
const MAX_TITLE = 60;
const DESCRIPTION_RANGE = [120, 160];
const KEYWORD_WINDOW = 100;
const MIN_INTERNAL_LINKS = 3;
const MIN_EXTERNAL_LINKS = 2;
const FAQ_RANGE = [4, 8];
const OWN_HOSTS = new Set(["rybbit.com", "www.rybbit.com", "rybbit.io", "www.rybbit.io"]);

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const fileArgs = args.filter(a => !a.startsWith("--"));

const errors = [];
const warnings = [];
const error = (file, msg) => errors.push(`${relative(root, file)}: error: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(root, file)}: warning: ${msg}`);

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { fm, body: src.slice(m[0].length) };
}

// Drop fenced code, inline code and comments so their contents never count as headings, links or prose.
function stripCode(body) {
  return body
    .replace(/^(```|~~~)[\s\S]*?^\1\s*$/gm, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function proseWords(body) {
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their text
    .replace(/<[^>]+>/g, " ") // JSX / HTML tags
    .replace(/^\s*(import|export)\s.*$/gm, " ");
  return normalize(text).split(" ").filter(Boolean);
}

// "what is session replay" counts as present when the prose says "session replay", and
// "google analytics alternatives" when it says "google analytics alternative".
const QUERY_PREFIX = /^(what is|what are|how to|how do i|best|top)\s+/;
function keywordVariants(keyword) {
  const base = normalize(keyword);
  const cores = new Set([base, base.replace(QUERY_PREFIX, "")]);
  const variants = new Set();
  for (const core of cores) {
    variants.add(core);
    variants.add(core.endsWith("s") ? core.slice(0, -1) : `${core}s`);
  }
  return [...variants].filter(Boolean);
}

function links(body) {
  const hrefs = [];
  for (const m of body.matchAll(/(?<!!)\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) hrefs.push(m[1]);
  for (const m of body.matchAll(/<(?:a|Link)\b[^>]*\bhref=["']([^"']+)["']/g)) hrefs.push(m[1]);
  const internal = new Set();
  const external = new Set();
  for (const href of hrefs) {
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (/^https?:\/\//i.test(href)) {
      let host = "";
      try {
        host = new URL(href).hostname.toLowerCase();
      } catch {
        continue;
      }
      if (OWN_HOSTS.has(host)) internal.add(new URL(href).pathname);
      // app.rybbit.io, demo.rybbit.com and friends are neither site pages nor outside sources.
      else if (/(^|\.)rybbit\.(com|io)$/.test(host)) continue;
      else external.add(href.replace(/#.*$/, ""));
    } else {
      internal.add(href.replace(/#.*$/, ""));
    }
  }
  return { internal, external };
}

function images(body) {
  const srcs = [];
  for (const m of body.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)) srcs.push(m[1]);
  for (const m of body.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/g)) srcs.push(m[1]);
  return srcs;
}

// Questions in the FAQ section: H3 headings or bold-only lines that end with "?".
function faqQuestionCount(body) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex(l => /^##\s+(faqs?|frequently asked questions)\b/i.test(l.trim()));
  if (start === -1) return null;
  let count = 0;
  for (const line of lines.slice(start + 1)) {
    const t = line.trim();
    if (/^##\s/.test(t)) break;
    if (/^###\s+\S/.test(t) || /^\*\*[^*]+\?\*\*$/.test(t)) count++;
  }
  return count;
}

function lint(file) {
  const src = readFileSync(file, "utf8");
  const parsed = frontmatter(src);
  if (!parsed) {
    error(file, "missing frontmatter");
    return;
  }
  const { fm, body: rawBody } = parsed;
  const body = stripCode(rawBody);

  for (const key of ["title", "description", "date", "keyword"]) {
    if (!fm[key]) error(file, `frontmatter: ${key} missing`);
  }

  // The post template renders the frontmatter title as the page's only H1.
  for (const m of body.matchAll(/^#\s+(.+)$/gm)) {
    error(file, `body H1 "${m[1].trim()}": the template already renders the title as the H1; use ## or remove it`);
  }

  if (/<img\b/i.test(body)) {
    error(file, "raw <img> tag: use markdown ![alt](src) so the image goes through next/image");
  }
  for (const src of images(body)) {
    if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) continue;
    const path = src.startsWith("/") ? join(publicDir, src) : resolve(dirname(file), src);
    if (!existsSync(path.split(/[?#]/)[0])) error(file, `image not found: ${src}`);
  }

  if (fm.title) {
    const rendered = fm.title + TITLE_SUFFIX;
    if (rendered.length > MAX_TITLE) {
      warn(file, `title renders at ${rendered.length} characters with "${TITLE_SUFFIX}" (max ${MAX_TITLE})`);
    }
  }
  if (fm.description) {
    const len = fm.description.length;
    const [min, max] = DESCRIPTION_RANGE;
    if (len < min || len > max) warn(file, `description is ${len} characters (aim for ${min}-${max})`);
  }

  if (fm.keyword) {
    const words = ` ${proseWords(body).slice(0, KEYWORD_WINDOW).join(" ")} `;
    if (!keywordVariants(fm.keyword).some(v => words.includes(` ${v} `))) {
      warn(file, `keyword "${fm.keyword}" not in the first ${KEYWORD_WINDOW} words of the body`);
    }
  }

  const { internal, external } = links(body);
  if (internal.size < MIN_INTERNAL_LINKS) {
    warn(file, `${internal.size} internal link(s) (want at least ${MIN_INTERNAL_LINKS})`);
  }
  if (external.size < MIN_EXTERNAL_LINKS) {
    warn(file, `${external.size} external link(s) (want at least ${MIN_EXTERNAL_LINKS})`);
  }

  const faq = faqQuestionCount(body);
  if (faq !== null) {
    const [min, max] = FAQ_RANGE;
    if (faq < min || faq > max) warn(file, `FAQ has ${faq} question(s) (aim for ${min}-${max})`);
  }
}

let files;
if (fileArgs.length) {
  files = [];
  for (const arg of fileArgs) {
    const path = resolve(process.cwd(), arg);
    if (!existsSync(path) || !statSync(path).isFile() || !path.endsWith(".mdx")) {
      errors.push(`${arg}: error: file not found or not an .mdx file`);
    } else {
      files.push(path);
    }
  }
} else {
  files = readdirSync(blogDir)
    .filter(name => name.endsWith(".mdx"))
    .map(name => join(blogDir, name));
}

for (const file of files) lint(file);

if (warnings.length) console.warn(warnings.join("\n"));
if (errors.length) console.error(errors.join("\n"));
const summary = `${files.length} post(s): ${errors.length} error(s), ${warnings.length} warning(s)`;
if (errors.length || (strict && warnings.length)) {
  console.error(`\n${summary}${strict && !errors.length ? " (--strict fails on warnings)" : ""}`);
  process.exit(1);
}
console.log(`${warnings.length ? "\n" : ""}${summary}`);
