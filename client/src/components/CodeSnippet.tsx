"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeSnippetProps extends React.HTMLAttributes<HTMLPreElement> {
  code: string;
  language?: string;
}

export function CodeSnippet({
  code,
  language,
  className,
  ...props
}: CodeSnippetProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  const copyToClipboard = React.useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative">
      <pre
        className={cn("overflow-x-auto rounded-lg border-neutral-500 bg-muted p-3 text-wrap font-mono text-sm", className)}
        {...props}
      >
        {language && (
          <div className="mb-1 text-xs text-muted-foreground">{language}</div>
        )}
        <code className="relative rounded bg-muted p-0">{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-3 top-3 h-6 w-6"
        onClick={copyToClipboard}
      >
        {hasCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
        <span className="sr-only">Copy code</span>
      </Button>
    </div>
  );
}
