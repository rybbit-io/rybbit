---
category: Forms
---

Multi-line text field for notes, descriptions and pasted snippets. Same chassis as `Input` (transparent fill, 1px `neutral-800` border, `neutral-400` placeholder, ring on focus) with a 60px minimum height and vertical resize. Use it for annotation notes, site descriptions, alert messages, and raw filter/config text; use `Input` for anything that fits on one line.

Parts: `Textarea` only. Forwards every native `<textarea>` prop (`rows`, `placeholder`, `defaultValue`, `disabled`, `aria-invalid`, `ref`).

Conventions:
- Default height is `min-h-[60px]`; set `rows={5}` (or `className="min-h-32"`) for longer content.
- Text is 14px at md+ (`text-base` on phones so iOS doesn't zoom). Add `font-mono text-xs` for code-like content such as rule DSLs.
- There is no invalid style baked in (unlike `Input`): pass `aria-invalid="true"` for accessibility plus `className="dark:border-red-400"` for the red border (the `dark:` prefix is required: the component's own `dark:border-neutral-800` overrides a bare `border-red-400`), and put the message in a `text-xs text-red-400` line below. A right-aligned `text-xs text-neutral-400 tabular-nums` counter goes on the same row.
- `disabled` fades to 50% opacity. Always pair with a `Label` via `htmlFor`.

```tsx
<div className="grid gap-1.5">
  <Label htmlFor="note">Annotation note</Label>
  <Textarea id="note" placeholder="What changed on this date?" />
</div>

<Textarea rows={5} className="font-mono text-xs" defaultValue={"path contains /docs\nAND country is Germany"} />
```
