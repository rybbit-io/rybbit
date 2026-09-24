#!/usr/bin/env node
// Lint every integration guide against content/partials/guides/README.md.
// Usage: node scripts/check-guides.mjs   (exit 1 on any violation)
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { bundledLanguagesInfo } from "shiki";

// Shiki throws at build time for an unknown fence language, which 500s EVERY docs page.
const knownLangs = new Set(["text", "txt", "plain"]);
for (const l of bundledLanguagesInfo) { knownLangs.add(l.id); for (const a of l.aliases ?? []) knownLangs.add(a); }

const root = resolve(new URL("..", import.meta.url).pathname);
const guidesDir = join(root, "content/docs/(docs)/guides");
const partialsDir = join(root, "content/partials/guides");
const categories = JSON.parse(readFileSync(join(root, "src/lib/guide-categories.json"), "utf8")).map(c => c.key);

const errors = [];
const fail = (file, msg) => errors.push(`${relative(root, file)}: ${msg}`);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return name.endsWith(".mdx") ? [p] : [];
  });
}

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return fm;
}

const guides = walk(guidesDir).filter(p => !p.endsWith("/index.mdx"));
const slugs = new Set();

for (const file of guides) {
  const src = readFileSync(file, "utf8");
  const fm = frontmatter(src);
  const rel = relative(guidesDir, file).replace(/\.mdx$/, "");
  slugs.add(rel);
  const depth = rel.split("/").length; // 1 for top-level, 2 for react/next-js
  const up = "../".repeat(depth + 2);

  if (!fm) { fail(file, "missing frontmatter"); continue; }
  if (!fm.title) fail(file, "frontmatter: title missing");
  if (!fm.description) fail(file, "frontmatter: description missing");
  else if (!/^Add Rybbit analytics to your .+$/.test(fm.description))
    fail(file, `frontmatter: description must start with "Add Rybbit analytics to your" (got "${fm.description}")`);
  if (!fm.category) fail(file, "frontmatter: category missing");
  else if (!categories.includes(fm.category)) fail(file, `frontmatter: unknown category "${fm.category}"`);
  if (fm.icon && !/^Si[A-Z0-9]/.test(fm.icon)) fail(file, `frontmatter: icon must be a simple-icons export name (got "${fm.icon}")`);

  const steps = (src.match(/<Step>/g) ?? []).length;
  if (steps !== 3) fail(file, `expected exactly 3 <Step> blocks, found ${steps}`);
  if (!/^### Get your tracking snippet\s*$/m.test(src)) fail(file, 'missing step heading "### Get your tracking snippet"');
  if (!/^### Add the snippet to .+$/m.test(src)) fail(file, 'missing step heading "### Add the snippet to <Platform>"');
  if (!/^### Verify installation\s*$/m.test(src)) fail(file, 'missing step heading "### Verify installation"');
  if (!/^## Next steps\s*$/m.test(src)) fail(file, 'missing "## Next steps" section');

  for (const partial of ["get-snippet", "verify", "next-steps"]) {
    const tag = `<include>${up}partials/guides/${partial}.mdx</include>`;
    if (!src.includes(tag)) fail(file, `missing ${tag}`);
  }
  for (const m of src.matchAll(/<include>(.*?)<\/include>/g)) {
    const target = resolve(dirname(file), m[1]);
    if (!existsSync(target)) fail(file, `include target does not exist: ${m[1]}`);
  }

  const headings = [...src.matchAll(/^## (.+)$/gm)].map(m => m[1].trim());
  const allowed = ["Track custom events", "Troubleshooting", "Next steps"];
  for (const h of headings) if (!allowed.includes(h)) fail(file, `unexpected H2 "${h}" (allowed: ${allowed.join(", ")}; use H3 inside a step for anything else)`);
  if (headings.length && headings[headings.length - 1] !== "Next steps") fail(file, '"## Next steps" must be the last section');

  for (const m of src.matchAll(/^```([\w+#.-]+)/gm)) {
    if (!knownLangs.has(m[1].toLowerCase())) fail(file, `unknown code fence language "${m[1]}" (Shiki would crash the build); use a shiki language id such as html, razor, liquid, twig, erb, heex, jinja`);
  }
  if (/data-site-id/.test(src)) fail(file, "legacy data-site-id attribute; use script.js?siteId=");
  for (const m of src.matchAll(/api\/script\.js(?!\?siteId=)/g)) {
    // allow parameterised URLs in template languages ("/api/script.js?siteId={{ ... }}") – only the bare form is wrong
    fail(file, `script URL without ?siteId= at offset ${m.index}`);
  }
  for (const m of src.matchAll(/^import .* from '.*';?$/gm)) fail(file, `single-quoted import: ${m[0]}`);
  if (/\b(seamless(ly)?|powerful|easily|effortless(ly)?)\b/i.test(src)) fail(file, "marketing filler word (seamless/powerful/easily/effortless)");
}

// meta.json coverage
function checkMeta(dir, prefix) {
  const metaPath = join(dir, "meta.json");
  if (!existsSync(metaPath)) { fail(metaPath, "missing meta.json"); return; }
  const pages = JSON.parse(readFileSync(metaPath, "utf8")).pages ?? [];
  const listed = pages.filter(p => !p.startsWith("---") && p !== "index" && p !== "...");
  const local = readdirSync(dir).filter(n => n !== "meta.json" && n !== "index.mdx").map(n => n.replace(/\.mdx$/, ""));
  for (const p of listed) if (!local.includes(p)) fail(metaPath, `lists "${p}" which does not exist`);
  for (const n of local) if (!listed.includes(n)) fail(metaPath, `does not list "${n}"`);
  for (const n of local) {
    const sub = join(dir, n);
    if (existsSync(sub) && statSync(sub).isDirectory()) checkMeta(sub, `${prefix}${n}/`);
  }
}
checkMeta(guidesDir, "");

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s) in integration guides. See content/partials/guides/README.md`);
  process.exit(1);
}
console.log(`${guides.length} guides OK`);
