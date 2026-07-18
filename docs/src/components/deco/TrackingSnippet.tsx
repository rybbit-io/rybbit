import { cn } from "@/lib/utils";

/**
 * The real one-line install artifact, shown as a small editor card. Code is
 * intentionally untranslated; the surrounding section copy carries the i18n.
 */
export function TrackingSnippet({ className }: { className?: string }) {
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
        <span className="ml-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">index.html</span>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-6">
        <code className="text-neutral-500 dark:text-neutral-400">
          {"<script"}
          {"\n  "}
          <span className="text-neutral-700 dark:text-neutral-300">src</span>
          {"="}
          <span className="text-emerald-700 dark:text-emerald-400">{'"https://app.rybbit.io/api/script.js"'}</span>
          {"\n  "}
          <span className="text-neutral-700 dark:text-neutral-300">data-site-id</span>
          {"="}
          <span className="text-emerald-700 dark:text-emerald-400">{'"YOUR_SITE_ID"'}</span>
          {"\n  "}
          <span className="text-neutral-700 dark:text-neutral-300">async</span>
          {"\n"}
          {"></script>"}
        </code>
      </pre>
    </div>
  );
}
