---
category: Navigation
---

Location trail for deep pages (a user profile, a funnel, an org settings sub-page). Ancestors are muted links, the current page is bright plain text, and a small chevron separates them. Use it only when the page is two or more levels below a sidebar destination; top-level report pages do not need one.

Parts: `Breadcrumb` (`<nav aria-label="breadcrumb">`) → `BreadcrumbList` (`<ol>`, 14px muted text, wraps) → `BreadcrumbItem` (`<li>`) containing either `BreadcrumbLink` (`href`, or `asChild` to wrap a router `Link`) or `BreadcrumbPage` (current page, `aria-current="page"`). Put a `BreadcrumbSeparator` between items: with no children it renders a 14px `ChevronRight`; pass any node (e.g. `<Slash />`) to replace it. `BreadcrumbEllipsis` is a 36px "…" placeholder for collapsed middle levels; wrap it in its own `BreadcrumbItem`.

Conventions: the site domain (`tomato.gg`) is the first crumb inside a site; keep at most four visible crumbs and collapse the rest with the ellipsis; the last item is always a `BreadcrumbPage`, never a link. Hover brightening on links is a live state and is not shown statically.

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/tomato.gg">tomato.gg</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/tomato.gg/users">Users</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>usr_8f3a91c2</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```
