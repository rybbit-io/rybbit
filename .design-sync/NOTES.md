# design-sync notes (Rybbit)

Repo-specific facts a future sync needs. Config lives in `config.json`; this file holds the why.

## Shape and layout
- Rybbit is a Next.js app, not a package: the design system is `client/src/components/ui/*.tsx`
  (shadcn new-york style, Tailwind v4, Radix). No Storybook anywhere; shape = `package`.
- `.design-sync/pkg/` is a committed **facade package** (`@rybbit/ui`) built by `node .design-sync/pkg/build.mjs`
  (= `cfg.buildCmd`, run before every converter run):
  - `src/index.ts` barrel: one `export *` per ui file. `basic-tabs` clashes with `tabs` on
    Tabs/TabsList/TabsTrigger/TabsContent, so it's re-exported as `BasicTabs*`.
  - `src/shims/utils.ts` replaces `@/lib/utils` (the real one imports luxon, Avatar, the app store).
    Exports `cn` + `formatter` (input-with-suggestions uses `formatter`). Add here if a ui file
    starts importing something else from `@/lib/utils` (esbuild fails loudly: "No matching export").
  - `src/RybbitTheme.tsx`: the `cfg.provider`. Adds `dark` to `<html>` (portals!) and the wrapper,
    Inter font, `bg-background text-foreground`, wraps `TooltipProvider` (Radix Tooltip throws without it).
  - `src/styles.css`: `@import`s the app's `globals.css`, scans `client/src` + `.design-sync/previews`,
    vendors Inter (`fonts/*.woff2`, copied from `client/.next/static/media` next/font output; latin +
    latin-ext, SIL OFL), and carries a **`@source inline()` safelist** so utilities the app never uses
    (`grid-cols-3`, `bg-card`, `md:` variants, `/20` tints, fractions) still exist for the design
    agent. Output ~650 KB. Trim the safelist if the README size warning ever fires body-side.
  - tsc emits declarations with `rootDir: ../..` → `dist/types/{client,.design-sync}/...`;
    `dist/types/index.d.ts` is the types root (so ts-morph parses the whole tree); `@/` specifiers
    in the emitted d.ts are rewritten to relative paths by build.mjs.
  - `pkg/node_modules` is a symlink to `client/node_modules` created by build.mjs (gitignored).
  - Toolchain: esbuild from `.ds-sync/node_modules` (the staged converter deps); typescript,
    postcss, @tailwindcss/postcss from `client/node_modules`. So `.ds-sync` must be staged +
    installed BEFORE running build.mjs on a fresh clone.
- Converter invocation: `--entry .design-sync/pkg/dist/index.js --node-modules client/node_modules`.
  PKG_DIR resolves to `.design-sync/pkg` (walk-up to the named package.json).
- Cards are **one per family** (39): every PascalCase sub-part (DialogContent, TableRow, …) is
  `null` in `cfg.componentSrcMap` (134 entries) but still ships on `window.Rybbit`. Each family's
  `.design-sync/docs/<Name>.md` lists its parts; a doc body REPLACES the synthesized examples in
  `.prompt.md`, so every doc must carry an example.
- Grouping comes from the docs' `category:` frontmatter (`ui/` is a generic dir name, so
  src-derived groups would all be "general"). Categories: Actions, Forms, Overlays, Navigation,
  Data display, Feedback, Replay.
- `cfg.guidelinesGlob` pulls repo-root `DESIGN.md` + `PRODUCT.md` into `guidelines/`.
- Sub-part exclusion means `Toaster` needs an explicit src pin (`sonner.tsx`).

## Verification harness
- Chromium is cached at `~/Library/Caches/ms-playwright/chromium-1234` (+1228). `playwright@1.62.x`
  pins 1234, so `.ds-sync` installs `playwright@1.62.1` and no browser download is needed.
  If the cache moves, set `DS_CHROMIUM_PATH` to the executable instead of reinstalling.
- `preview-rebuild.mjs` does NOT recompile the facade CSS; a preview using a utility outside the
  app's usage + safelist only renders after `build.mjs` + a full converter run.

## Preview-authoring learnings (folded from the first-sync batches)
- Authoring brief for future previews: `.design-sync/AUTHORING.md` (what subagents were told; keep it current).
- Overriding a component colour that the component sets with a `dark:` prefix needs a `dark:` prefix too
  (`dark:border-red-400`, `dark:bg-neutral-700`), or the component's own rule wins on specificity.
- Arbitrary values (`w-[420px]`, `aria-[invalid=true]:…`) only exist in the CSS if the app or an authored
  preview uses them at FULL rebuild time; the safelist covers scale values only. Prefer `w-64/72/80/96`,
  `max-w-*`, `grid-cols-*`. `preview-rebuild` never recompiles CSS.
- `[CONFIG_STALE]`: adding `cfg.overrides.<Name>` after a full build blocks `preview-rebuild --components <Name>`
  until the next `package-build.mjs`. Set card modes BEFORE fanning out, or expect the wave to report blocked
  components (first sync: Select, MultiSelect, InputWithSuggestions, DropdownMenu, Toaster).
- Capture clock is pinned to 2024-05-15: Calendar previews use `defaultMonth` May 2024.
- Radix Popover autofocuses its first focusable child → blue browser ring in captures; previews pass
  `onOpenAutoFocus={e => e.preventDefault()}`.
- MultiSelect has no `open` prop (mount effect clicks the combobox); InputWithSuggestions opens on focus
  (mount effect focuses + dispatches `focusin`); NavigationMenu opens statically via `value` on root + item.
- Toaster: react-hot-toast auto-dismisses success at 2s, others at 4s; the preview fires toasts from a
  mount effect, so a capture slower than ~2s loses the Success cell.
- `CommandList` caps at 300px (`max-h-[300px]`): keep palette previews ≤7 rows.
- Slider / TimelineSlider `disabled` looks identical to enabled (the `disabled:` utility sits on a span).
- Solo `?story=` capture bodies are white in emit.mjs; RybbitTheme now paints `<body>` with
  `bg-background text-foreground` (as the app's root layout does), so portalled overlays composite over dark.
- `CardLoader` and `Toaster` read next-themes `useTheme()`: RybbitTheme mounts a forced-theme ThemeProvider.

## Known render warns
- `[TOKENS_MISSING] --card, --card-foreground, --radix-navigation-menu-viewport-height/width`: globals.css
  declares `--color-card: hsl(var(--card))` in `@theme` but never defines `--card` (the app never uses
  `bg-card`); the radix vars are set at runtime by NavigationMenu. Harmless; conventions.md steers the
  agent to `bg-neutral-900` for cards.
- First-sync floor cards flagged `[RENDER_BLANK]` for ActivitySlider/Checkbox/Input/Progress/Slider/
  Textarea/TimelineSlider — gone once previews were authored; a re-sync that drops a preview will
  bring one back.

## Re-sync risks
- Vendored Inter subsets in `pkg/fonts/` are a snapshot of next/font output; if the app changes fonts,
  re-copy from `client/.next/static/media` (the `.p.woff2` = latin) and update `src/styles.css` ranges.
- `.ds-sync/` must be staged + `npm i esbuild ts-morph @types/react playwright@1.62.1` (chromium-1234
  cache) BEFORE `build.mjs`, which borrows esbuild from there. A newer chromium cache needs the matching
  playwright or `DS_CHROMIUM_PATH`.
- The safelist in `pkg/src/styles.css` is hand-curated: new token families added to globals.css (a new
  colour role, a new radius) must be appended there or the design agent can't reach them.
- `componentSrcMap` nulls enumerate 134 sub-part exports by name. A NEW ui file with new PascalCase parts
  will surface each part as its own card until its parts are added as `null` (and a `docs/<Name>.md`
  with a `category:` is written) — the `components:` count jumping past 39 is the tell.
- Toaster's Success cell depends on capture finishing within ~2s of load (react-hot-toast auto-dismiss).
- Previews assume the capture clock is pinned to 2024-05-15 (Calendar) and a 720px-wide single-card
  viewport for ResponsiveDialog's dialog branch.
- Capture stamps for AlertDialog/Sheet/Drawer/ResponsiveDialog/Popover/Tooltip were first minted from a
  scratch copy of ds-bundle (batch C worked around [CONFIG_STALE]); they carried forward cleanly on the
  final driver run, so no action — noted only in case a future run reports them as cleared.
- `pkg/build.mjs` runs `tsc` over client sources under `strict`; type errors are printed but do not
  block emit. If `dist/types/.design-sync/pkg/src/index.d.ts` disappears, the build exits 1.
