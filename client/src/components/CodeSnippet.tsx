"use client";

import { useExtracted } from "next-intl";
import * as React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import php from "react-syntax-highlighter/dist/esm/languages/hljs/php";
import ruby from "react-syntax-highlighter/dist/esm/languages/hljs/ruby";
import go from "react-syntax-highlighter/dist/esm/languages/hljs/go";
import rust from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java";
import csharp from "react-syntax-highlighter/dist/esm/languages/hljs/csharp";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import { vs2015, vs } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "next-themes";

import { CopyButton } from "@/components/interior/copy-button";
import { cn } from "@/lib/utils";

// Register only the languages we need
SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("php", php);
SyntaxHighlighter.registerLanguage("ruby", ruby);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("json", json);

interface CodeSnippetProps extends React.HTMLAttributes<HTMLPreElement> {
  code: string;
  language?: string;
  showLanguageLabel?: boolean;
}

export const CodeSnippet = React.memo(function CodeSnippet({
  code,
  language,
  showLanguageLabel = false,
  className,
}: CodeSnippetProps) {
  const t = useExtracted();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={cn("relative border border-neutral-150 dark:border-neutral-800 rounded-md", className)}>
      {showLanguageLabel && language && (
        <div className="absolute left-3 top-2 text-xs text-neutral-400 z-10">{language}</div>
      )}
      <SyntaxHighlighter
        language={language || "text"}
        style={isDark ? vs2015 : vs}
        customStyle={{
          margin: 0,
          borderRadius: "4px",
          fontSize: "12px",
          padding: showLanguageLabel ? "20px 10px 10px 10px" : "10px",
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
      <CopyButton iconOnly size="xs" value={code} label={t("Copy code")} className="absolute right-2 top-2" />
    </div>
  );
});
