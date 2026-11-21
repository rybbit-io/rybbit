# design-sync preview authoring brief (shared by every batch agent)

Repo root: /Users/bill/Desktop/rybbit. You are authoring preview cards + usage docs for Rybbit's
shadcn-style UI kit so a design agent (claude.ai/design) can build on-brand dashboards with the REAL
components. Rybbit = open-source, privacy-friendly web analytics (dark-mode-first instrument panel:
neutral grays, ONE emerald accent for primary actions/success, periwinkle for chart data). Read
/Users/bill/Desktop/rybbit/DESIGN.md sections 1-3 once for the voice.

## What exists
- Component sources: client/src/components/ui/<kebab-name>.tsx. Read each one you own: parts,
  variants (cva), props. Every part is a flat named export of the "@rybbit/ui" facade
  (e.g. Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel).
  BasicTabs family is exported as BasicTabs/BasicTabsList/BasicTabsTrigger/BasicTabsContent.
- Every preview is auto-wrapped in <RybbitTheme> (dark class on <html> + wrapper, Inter font,
  bg-background, TooltipProvider). Don't add providers yourself.
- Worked examples that already grade "good": .design-sync/previews/Button.tsx, Dialog.tsx, Table.tsx
  and docs .design-sync/docs/Button.md, Dialog.md, Table.md. Match their style.
- Compiled CSS = the app's Tailwind v4 build, scanned over client/src (+ previews at FULL rebuild
  only). preview-rebuild does NOT recompile CSS, so prefer utilities the app already uses
  (flex, grid, gap-*, p-*, w-*, max-w-*, text-*, rounded-lg, border-neutral-800, bg-neutral-900…).
  If a utility visibly has no effect, note it in your learnings file and use a common one.

## Deliverables per component <Name>
1. `.design-sync/previews/<Name>.tsx` — named exports, each a React component (function), realistic
   Rybbit content (sites like tomato.gg / rybbit.com, pages, visitors, sessions, goals, funnels,
   countries, browsers — never foo/bar/lorem). 2-6 exports: one canonical story, the main variant
   axis swept, static states (disabled/error/loading/checked/open), realistic composition for
   compounds. Wrap each story's root in a padded container, e.g. `<div className="p-4 w-[420px]">`
   (or w-full / max-w-md), so the dark panel has breathing room. Imports allowed: "react",
   "@rybbit/ui", "lucide-react", "react-hook-form" (Form only). Overlays render OPEN
   (`open` / `defaultOpen`, Tooltip `open`); states that can't render statically (hover, drag) are
   skipped — say so in the doc.
2. `.design-sync/docs/<Name>.md` — frontmatter `---\ncategory: <Category>\n---` (category given
   per component below), then: one paragraph what/when; the parts and their roles (flat export
   names); conventions (variants, sizes, when to use vs. siblings); ONE tsx example ≤ 30 lines.
   This body becomes the design agent's whole usage reference (it replaces auto examples), so be
   concrete and name real exports/props only.
3. Grade file `.design-sync/.cache/review/<Name>.grade.json`:
   `{"cells":{"<ExportName>":{"verdict":"good"|"needs-work","note":"..."}}}` — keys = export
   names exactly (the capture log prints them).

## Loop (per component or per batch)
```
cd /Users/bill/Desktop/rybbit
node .ds-sync/lib/preview-rebuild.mjs --config .design-sync/config.json --node-modules client/node_modules --out ./ds-bundle --components A,B,C
node .ds-sync/package-capture.mjs --out ./ds-bundle --components A,B,C
```
Then Read `ds-bundle/_screenshots/review/*__<Name>.png` (group prefix may be "general" until the
orchestrator's full rebuild — use the glob) and grade on the absolute rubric: Styled (Rybbit
tokens/Inter visibly applied, dark panel), Complete (nothing collapsed/missing/error cell "⚠"),
Plausible (a Rybbit engineer would recognize it). `needs-work` → fix the .tsx → rebuild →
recapture → regrade, until every cell is `good` (cap ~4 iterations; if still stuck, leave it
needs-work with a precise note). A cell whose compile failed shows in the rebuild log as
`! preview build failed: <Name>` — fix the TSX. Never grade a sheet you haven't Read this iteration.

## Hard rules
- Edit ONLY your assigned previews/<Name>.tsx, docs/<Name>.md, your grade files, and
  `.design-sync/learnings/<BATCH>.md`. Never touch config.json, NOTES.md, pkg/, other agents' files.
- NEVER run package-build.mjs, package-validate.mjs, or package-capture without --components.
- Need a config change (cardMode single/column, viewport WxH, a skip)? Write it in your learnings
  file — the orchestrator applies it. Overlay families already have cardMode single + a viewport.
- Same root cause in 2+ components, or anything config-level (provider/css/font/import
  resolution) → STOP on those and report in learnings; that's global.
- Finish with `git status --short .design-sync` and confirm only your files changed. Final
  report: per component, exports + verdicts, and anything the orchestrator must do.
