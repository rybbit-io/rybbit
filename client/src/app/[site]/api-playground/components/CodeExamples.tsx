"use client";

import { memo, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CodeSnippet } from "@/components/CodeSnippet";
import { codeGenerators, languageOrder, CodeGenConfig } from "../utils/codeGenerators";

interface CodeExamplesProps {
  config: CodeGenConfig;
}

export const CodeExamples = memo(function CodeExamples({ config }: CodeExamplesProps) {
  const [selectedLang, setSelectedLang] = useState("cURL");

  // Memoize the code generation
  const code = useMemo(() => codeGenerators[selectedLang]?.(config) || "", [selectedLang, config]);

  const language = useMemo(() => getLanguageForHighlight(selectedLang), [selectedLang]);

  return (
    <div className="space-y-2">
      {/* Language tabs */}
      <div className="flex flex-wrap gap-1">
        {languageOrder.map(lang => (
          <button
            key={lang}
            onClick={() => setSelectedLang(lang)}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              selectedLang === lang
                ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Code display */}
      <CodeSnippet code={code} language={language} />
    </div>
  );
});

function getLanguageForHighlight(lang: string): string {
  const map: Record<string, string> = {
    cURL: "bash",
    JavaScript: "javascript",
    Python: "python",
    PHP: "php",
    Ruby: "ruby",
    Go: "go",
    Rust: "rust",
    Java: "java",
    ".NET": "csharp",
  };
  return map[lang] || "text";
}
