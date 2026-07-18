import { cn } from "@/lib/utils";

/**
 * The real MCP client configuration, shown as a small editor card — the
 * agent-side sibling of TrackingSnippet. Code is intentionally untranslated;
 * the surrounding section copy carries the i18n.
 */
export function McpConfigSnippet({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <span aria-hidden="true" className="size-2 rounded-full bg-[#ff5f57]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[#febc2e]" />
        <span aria-hidden="true" className="size-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">mcp.json</span>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-6">
        <code className="text-neutral-500 dark:text-neutral-400">
          {"{"}
          {"\n  "}
          <span className="text-neutral-700 dark:text-neutral-300">{'"mcpServers"'}</span>
          {": {"}
          {"\n    "}
          <span className="text-neutral-700 dark:text-neutral-300">{'"rybbit"'}</span>
          {": {"}
          {"\n      "}
          <span className="text-neutral-700 dark:text-neutral-300">{'"url"'}</span>
          {": "}
          <span className="text-emerald-700 dark:text-emerald-400">{'"https://app.rybbit.io/api/mcp"'}</span>
          {"\n    }"}
          {"\n  }"}
          {"\n}"}
        </code>
      </pre>
    </div>
  );
}
