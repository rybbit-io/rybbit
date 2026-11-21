# Building with Rybbit UI

Rybbit is a dark-mode-first analytics dashboard: a flat grayscale "instrument panel" with exactly two chromatic voices — **emerald** for the one primary action / success / current selection, **periwinkle** (`dataviz`) for chart series only. No resting shadows, 1px hairline borders, tight radii (`rounded-lg` = 4.8px), 36px controls, Inter everywhere. Read `guidelines/DESIGN.md` for the rules before composing a screen.

## 1. Wrap everything in `RybbitTheme`

```jsx
const { RybbitTheme, Card, CardHeader, CardTitle, CardContent, Button } = window.Rybbit;
<RybbitTheme>                       {/* theme="light" for the light mirror */}
  <div className="min-h-screen bg-background p-6">…</div>
</RybbitTheme>
```

`RybbitTheme` puts the `dark` class on `<html>` and its root `div`, sets Inter, paints `bg-background text-foreground`, and mounts the `TooltipProvider` Radix tooltips require. Without it: light tokens, Arial, and every `Tooltip` throws. Portalled overlays (`DialogContent`, `DropdownMenuContent`, `SelectContent`, `PopoverContent`, `SheetContent`) render to `<body>` and pick the theme up from `<html>`, so one wrapper at the root is enough.

## 2. Styling idiom: Tailwind utility classes on `className`

Components take `className` (merged with `cn`/tailwind-merge, so your class overrides theirs). There are no style props. Compose layout with utilities; pick colors from the token families below (all compiled into `styles.css`; `hover:`, `dark:`, `sm:/md:/lg:`, `/20`-style opacity, and fractions like `w-1/2` are available for the color and layout families).

| Family | Use | Real class names |
|---|---|---|
| Canvas / surfaces | page → panel → raised chrome | `bg-background` · `bg-neutral-900` (card/panel) · `bg-neutral-850` (raised) · `bg-neutral-800` (hover) · `bg-muted` |
| Text | primary / secondary / muted | `text-foreground` · `text-neutral-300` · `text-muted-foreground` (= `text-neutral-400`) · `text-neutral-500` |
| Borders | always 1px hairlines | `border border-neutral-800` (panels) · `border-neutral-850` (cards) · `border-neutral-750` (raised chrome) · `border-border` |
| Accent (action/success) | ONE per view | `bg-accent-600 text-neutral-50 border-accent-700` (dark fill) · `text-accent-400` · `bg-accent-500/20 text-accent-400` (tint) |
| Data viz | chart series only, never chrome | `bg-dataviz` · `bg-dataviz-2` · `text-dataviz` |
| State | only when state demands | `text-red-400` / `bg-red-500/20` · `text-yellow-400` / `bg-yellow-500/20` · `text-blue-400` / `bg-blue-500/20` |
| Type scale | weight + size only, one family | headline `text-3xl font-semibold tabular-nums` · title `text-base font-semibold leading-none tracking-tight` · body `text-sm` · label `text-xs font-medium` |
| Shape & density | | `rounded-lg` (4.8px) · `rounded-md` (badges, xs buttons) · `p-4` card padding · `gap-2`/`gap-3` control gaps · `h-9` controls |

Raw CSS variables exist too when you need a value outside a class: `var(--color-background)`, `var(--color-neutral-900)`, `var(--color-accent-500)`, `var(--color-dataviz)`, `var(--color-muted-foreground)`, `var(--color-border)`, `var(--radius)` (0.3rem).

Rules that are easy to break: no `shadow-*` at rest (step the neutral instead); no emerald backgrounds on surfaces; no periwinkle on buttons or chrome; no gradients; numbers get `tabular-nums` and right alignment in tables.

## 3. Where the truth lives

- `styles.css` → `_ds_bundle.css`: the app's compiled Tailwind v4 stylesheet (tokens in `:root` / `.dark`, the full utility set above).
- `guidelines/DESIGN.md` (visual system, named rules) and `guidelines/PRODUCT.md` (register, users, anti-references).
- `components/<group>/<Name>/<Name>.prompt.md`: each family's parts, variants, and a real example. Compound families export their parts FLAT on `window.Rybbit` (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`… ; `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`…; `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`…; `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`; `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`). The family card's prompt.md lists every part.
- Icons: pass `lucide-react` icons as children; `Button` sizes any `svg` child to 16px.

## 4. One idiomatic screen fragment

```jsx
const { RybbitTheme, Card, CardHeader, CardTitle, CardDescription, CardContent,
        Button, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } = window.Rybbit;

<RybbitTheme>
  <main className="min-h-screen bg-background p-6 space-y-6">
    <header className="flex items-center justify-between">
      <h1 className="text-base font-semibold leading-none tracking-tight">tomato.gg</h1>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">Export CSV</Button>
        <Button variant="accent" size="sm">Add site</Button>
      </div>
    </header>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardDescription>Unique visitors</CardDescription>
          <CardTitle className="text-3xl tabular-nums">18.4K</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">+12% vs. previous 30 days</CardContent>
      </Card>
    </div>
    <Table>
      <TableHeader><TableRow><TableHead>Page</TableHead><TableHead className="text-right">Visitors</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody><TableRow>
        <TableCell className="font-medium">/pricing</TableCell>
        <TableCell className="text-right tabular-nums">6,120</TableCell>
        <TableCell><Badge variant="success">Tracking</Badge></TableCell>
      </TableRow></TableBody>
    </Table>
  </main>
</RybbitTheme>
```
