---
category: Forms
---

Searchable multi-value picker for filters (countries, browsers, pages, sites): an `outline` combobox button that grows to hold the chosen values as `secondary` badges with an X to remove, and a Popover + Command list with a search box and check marks. One component, no sub-parts: `MultiSelect`. Props: `options: { value, label, disabled? }[]`, `value: string[]` + `onValueChange(values)` (controlled; keep the array in state), `placeholder` (empty-state text, default "Select items..."), `searchPlaceholder`, `emptyText` ("No items found."), `disabled`, `className` (trigger), `badgeClassName` (chips).

Conventions: the trigger is `w-full` and at least 36px tall; chips wrap onto extra rows rather than truncating, so give it a bounded width (form column or `w-96`). The list opens on click only (no `open` prop) and filters by label substring; selecting toggles membership and keeps the list open. Use it when more than one value can be active at once; for a single choice use `Select`; for free text use `InputWithSuggestions`.

```tsx
const countries = [
  { value: "US", label: "United States" },
  { value: "DE", label: "Germany" },
  { value: "GB", label: "United Kingdom" },
];
const [selected, setSelected] = React.useState<string[]>(["US"]);

<MultiSelect
  options={countries}
  value={selected}
  onValueChange={setSelected}
  placeholder="Filter by country"
  searchPlaceholder="Search countries"
  emptyText="No country matches."
/>
```
