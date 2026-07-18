import { cn } from "@/lib/utils";

export interface CodeCardToken {
  text: string;
  className?: string;
}

interface CodeCardProps {
  label: string;
  tokens: CodeCardToken[];
  className?: string;
}

/**
 * A static editor-chrome code block matching TrackingSnippet's visual
 * language, for pages that show more than the install tag. Code content is
 * intentionally untranslated; surrounding section copy carries the i18n.
 */
export function CodeCard({ label, tokens, className }: CodeCardProps) {
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
        <span className="ml-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-6">
        <code className="text-neutral-500 dark:text-neutral-400">
          {tokens.map((token, index) => (
            <span key={index} className={token.className || undefined}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
