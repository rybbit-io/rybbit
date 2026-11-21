---
category: Navigation
---

Horizontal top-level nav bar (Radix) whose triggers open a content panel that drops from below the bar. It is for marketing/site-wide headers with a few sections, not for the dashboard sidebar (which is a plain list) and not for per-item actions (`DropdownMenu`). Plain links live in the same bar via `NavigationMenuLink` styled with `navigationMenuTriggerStyle()`.

Parts: `NavigationMenu` (root; renders the `NavigationMenuViewport` for you. Uncontrolled by default; pass `value` / `onValueChange` to force an item open) → `NavigationMenuList` (flex row) → `NavigationMenuItem` (give it `value` when controlling) containing either `NavigationMenuTrigger` (36px button, chevron built in and flips when open) + `NavigationMenuContent` (the panel body; size it yourself, e.g. `w-[400px] p-2`), or a bare `NavigationMenuLink` (`href`, `asChild`). `NavigationMenuIndicator` is an optional caret under the active trigger. The panel is a `bg-neutral-950` surface with a hairline `border-neutral-800`.

Conventions: 2-4 triggers plus 1-2 plain links; inside a panel list links as `block rounded-md p-3 hover:bg-neutral-800` blocks with a 14px medium title and a 12px `text-neutral-400` description. Give the container enough height below the bar for the panel. Hover-to-open and the slide animation are live behaviors; the preview forces the panel open with `value`.

```tsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Reports</NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid w-[400px] gap-1 p-2">
          <NavigationMenuLink asChild>
            <a href="/overview" className="block rounded-md p-3 hover:bg-neutral-800">
              <div className="text-sm font-medium">Overview</div>
              <p className="mt-1 text-xs text-neutral-400">Visitors, pageviews and top pages.</p>
            </a>
          </NavigationMenuLink>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink href="/docs" className={navigationMenuTriggerStyle()}>Docs</NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```
