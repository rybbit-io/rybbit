# Integration guide standard

Every page under `content/docs/(docs)/guides/` follows `TEMPLATE.mdx` in this folder.
`npm run lint:guides` checks every guide against the rules below and runs in CI.

## Rules

1. **Frontmatter**: `title` is the platform name as the vendor spells it. `description` is
   `Add Rybbit analytics to your <Platform> site` (use `app`, `store`, `docs`, `blog` when
   that is the better noun). `category` is one of the values in `scripts/check-guides.mjs`.
   `icon` is an `@icons-pack/react-simple-icons` export name (`SiWordpress`); omit it when
   the brand has no icon.
2. **Skeleton**: intro paragraph, then exactly three `<Step>`s titled
   `Get your tracking snippet`, `Add the snippet to <Platform>`, `Verify installation`.
   Optional `## Track custom events` and `## Troubleshooting`, then `## Next steps`.
3. **Shared content comes from partials**, never retyped:
   - `get-snippet.mdx` – the canonical snippet and the self-hosting note.
   - `verify.mdx` – the verification checklist.
   - `next-steps.mdx` – cross-links.
   Include with `<include>../../../partials/guides/<name>.mdx</include>` (one more `../`
   from a subfolder such as `react/`). Includes are inlined at build time, so they also
   reach the `.mdx` / `llms.txt` endpoints that AI agents read.
4. **Snippet form**: when a guide must show the tag inline (a template file, a config
   value, a JS injector), use the URL form `script.js?siteId=YOUR_SITE_ID` with `defer`.
   Never the legacy `data-site-id` attribute: script optimisers strip `data-*` attributes.
5. **Only platform-specific content belongs in the guide.** Generic explanations of what
   Rybbit is, how events work, GDPR, ad blockers or proxies are linked, not repeated.
6. **Don't invent UI.** Menu paths and file names must be real. If you cannot confirm
   where custom head code goes on a platform, say what the setting is usually called and
   point to the vendor's own page rather than guessing a path.
7. **Tone**: second person, present tense, imperative steps. No "powerful", "seamless",
   "easily". A guide is typically 40–120 lines; length comes from real platform detail,
   not padding.
8. **Imports**: double quotes, `Steps` before `Callout` before `Tabs`, only what is used.
9. **Sidebar**: add the slug to `guides/meta.json` under the matching `---Category---`
   separator, alphabetically. The index page (`guides/index.mdx`) groups by frontmatter
   `category` automatically.

## Adding a guide

```
cp content/partials/guides/TEMPLATE.mdx "content/docs/(docs)/guides/<slug>.mdx"
# fill it in, then
npm run lint:guides
```
