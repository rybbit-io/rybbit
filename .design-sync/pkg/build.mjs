// Builds the design-sync facade package from the app's real sources:
//   dist/index.js          ESM bundle of src/index.ts (deps stay external)
//   dist/types/**/*.d.ts   tsc declarations (rootDir = repo root)
//   dist/styles.css        client/src/app/globals.css compiled by Tailwind v4
//   dist/fonts/*.woff2     Inter subsets vendored from the Next build
// Toolchain: esbuild from ../../.ds-sync (the staged converter deps),
// typescript / postcss / @tailwindcss/postcss from ../../client/node_modules.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PKG = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(PKG, "../..");
const CLIENT = join(REPO, "client");
const CLIENT_NM = join(CLIENT, "node_modules");
const DIST = join(PKG, "dist");

// 1. node_modules symlink so tsc, ts-morph, and node resolution see the app's deps.
const nmLink = join(PKG, "node_modules");
if (!existsSync(nmLink)) symlinkSync(relative(PKG, CLIENT_NM), nmLink, "dir");

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// 2. JS bundle.
const dsRequire = createRequire(join(REPO, ".ds-sync", "package.json"));
const clientRequire = createRequire(join(CLIENT, "package.json"));
const esbuild = dsRequire("esbuild");
const aliasPlugin = {
  name: "rybbit-alias",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      if (args.path === "@/lib/utils") return { path: join(PKG, "src/shims/utils.ts") };
      const stem = join(CLIENT, "src", args.path.slice(2));
      for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        const p = stem + ext;
        if (existsSync(p) && !(ext === "" && !/\.[tj]sx?$/.test(p))) return { path: p };
      }
      return { errors: [{ text: `unresolved alias ${args.path}` }] };
    });
  },
};
const res = await esbuild.build({
  entryPoints: [join(PKG, "src/index.ts")],
  outfile: join(DIST, "index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  packages: "external",
  plugins: [aliasPlugin],
  logLevel: "silent",
  nodePaths: [CLIENT_NM],
});
const realWarnings = res.warnings.filter((w) => !/use client/.test(w.text));
for (const w of realWarnings) console.error(`  esbuild: ${w.text}`);
console.error(`  dist/index.js: ${(readFileSync(join(DIST, "index.js")).length / 1024).toFixed(0)} KB`);

// 3. Declarations.
const tsc = join(CLIENT_NM, ".bin", "tsc");
const r = spawnSync(tsc, ["-p", join(PKG, "tsconfig.json")], { cwd: PKG, encoding: "utf8" });
const tsErrors = (r.stdout.match(/error TS\d+/g) ?? []).length;
if (tsErrors) console.error(`  tsc: ${tsErrors} type error(s) (declarations still emitted):\n${r.stdout.split("\n").slice(0, 8).join("\n")}`);
const typesEntry = join(DIST, "types/.design-sync/pkg/src/index.d.ts");
if (!existsSync(typesEntry)) { console.error(`  tsc: no declarations emitted\n${r.stdout}${r.stderr}`); process.exit(1); }
// tsc keeps `@/` specifiers verbatim; rewrite them to relative paths so the
// .d.ts tree resolves without a paths-aware host.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".d.ts") ? [join(d, e.name)] : []);
const typesRoot = join(DIST, "types");
let rewritten = 0;
for (const f of walk(typesRoot)) {
  const src = readFileSync(f, "utf8");
  const out = src.replace(/(from\s+|import\()["']@\/([^"']+)["']/g, (_, pre, rest) => {
    const target = rest === "lib/utils"
      ? join(typesRoot, ".design-sync/pkg/src/shims/utils")
      : join(typesRoot, "client/src", rest);
    let rel = relative(dirname(f), target).split("\\").join("/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    return `${pre}"${rel}"`;
  });
  if (out !== src) { writeFileSync(f, out); rewritten++; }
}
// Root-level entry so the types root is dist/types (the converter parses the
// whole tree under dirname(package.json#types)).
writeFileSync(join(typesRoot, "index.d.ts"), 'export * from "./.design-sync/pkg/src/index";\n');
console.error(`  dist/types: ${walk(typesRoot).length} .d.ts files (${rewritten} alias-rewritten)`);

// 4. CSS + fonts.
const postcss = clientRequire("postcss");
const tailwind = clientRequire("@tailwindcss/postcss");
const cssIn = join(PKG, "src/styles.css");
const cssRes = await postcss([tailwind({ base: PKG })]).process(readFileSync(cssIn, "utf8"), { from: cssIn, to: join(DIST, "styles.css"), map: false });
writeFileSync(join(DIST, "styles.css"), cssRes.css);
mkdirSync(join(DIST, "fonts"), { recursive: true });
for (const f of readdirSync(join(PKG, "fonts"))) if (/\.woff2?$/.test(f)) cpSync(join(PKG, "fonts", f), join(DIST, "fonts", f));
console.error(`  dist/styles.css: ${(cssRes.css.length / 1024).toFixed(0)} KB; fonts: ${readdirSync(join(DIST, "fonts")).join(", ")}`);
