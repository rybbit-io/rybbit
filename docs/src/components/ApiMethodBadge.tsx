import type { ReactNode } from 'react';

/**
 * Text color per HTTP verb, mirroring the inline badges used inside the API docs.
 * The sidebar badge is text-only (no pill) to stay compact, matching the
 * fumadocs-openapi look.
 */
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-600 dark:text-green-400',
  POST: 'text-blue-600 dark:text-blue-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  PATCH: 'text-amber-600 dark:text-amber-400',
  DELETE: 'text-red-600 dark:text-red-400',
};

/**
 * Sidebar label for an API endpoint page: the page name on the left and the
 * HTTP method as a colored badge on the right. Used by the page-tree
 * transformer in `src/lib/source.ts`. Server-safe (no client hooks) so it can
 * be embedded in the page tree and serialized.
 */
export function ApiSidebarLabel({
  method,
  children,
}: {
  method?: string;
  children: ReactNode;
}) {
  if (!method) return <>{children}</>;

  return (
    <span className="inline-flex w-full items-center justify-between gap-2">
      <span className="truncate">{children}</span>
      <span
        className={`shrink-0 font-mono text-[10px] font-bold tracking-wider ${
          METHOD_COLORS[method] ?? 'text-fd-muted-foreground'
        }`}
      >
        {method}
      </span>
    </span>
  );
}
