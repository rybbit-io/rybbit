---
category: Forms
---

Single-line text field. Transparent fill, 1px `neutral-800` border, 4.8px radius, placeholder in `neutral-400`, and a 1px `neutral-300` ring on focus. Use it for every free-text, number, URL and password field in settings and dialogs; pair it with `Label` above via `htmlFor`.

Parts: `Input` only. It forwards every native `<input>` prop (`type`, `placeholder`, `defaultValue`, `disabled`, `aria-invalid`, `ref`).

Conventions:
- `inputSize="default"` (36px, 14px text) for forms; `inputSize="sm"` (28px, 12px text) for toolbar filters and table headers.
- `isSearch` renders a leading lucide `Search` icon and pads the text past it. Use it for every "Search / Filter …" box.
- `aria-invalid="true"` turns the border red; put the error text in a `text-xs text-red-400` line below.
- `disabled` drops the field to 50% opacity. Width comes from the container: it is `w-full`, so constrain with `className="w-32"` or a grid.
- Stack `Label` + `Input` in a `grid gap-1.5`; use `grid grid-cols-2 gap-3` for side-by-side fields. Prefer `Textarea` for multi-line, `Select` for enumerations.

```tsx
<div className="grid gap-1.5">
  <Label htmlFor="domain">Domain</Label>
  <Input id="domain" placeholder="example.com" defaultValue="tomato.gg" />
</div>

<Input isSearch inputSize="sm" placeholder="Search pages…" />

<div className="grid gap-1.5">
  <Input aria-invalid="true" defaultValue="not a domain" />
  <p className="text-xs text-red-400">Enter a valid domain, like tomato.gg</p>
</div>
```
