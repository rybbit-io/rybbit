---
category: Forms
---

A text `Input` that shows a filterable list of known values underneath while typing: page paths, event names, referrers, UTM values. Free text is always allowed; the suggestions are hints, not constraints. One component, no sub-parts: `InputWithSuggestions`. Props: `suggestions: { value, label?, count? }[]` (`count` renders right-aligned in compact form, e.g. 6.1K), `value` + `onValueChange(text)` for controlled use (uncontrolled works too), plus every `Input` prop (`placeholder`, `disabled`, `onChange`, `className`). Forwards its ref to the input element.

Conventions: the list opens on focus and on every keystroke, filters by case-insensitive substring of the current value, closes on outside click or when a row is picked, and is portalled (into the nearest `role="dialog"` or `body`) so it escapes overflow clipping. Sort suggestions by `count` descending so the most common value is first. Prefer it over `Select` when the value space is open-ended (any path could be typed) and over `MultiSelect` when only one value is being entered.

```tsx
const pages = [
  { value: "/pricing", count: 6120 },
  { value: "/docs/script", count: 4890 },
  { value: "/signup", count: 1975 },
];
const [path, setPath] = React.useState("");

<InputWithSuggestions
  value={path}
  onValueChange={setPath}
  suggestions={pages}
  placeholder="/checkout"
/>
```
