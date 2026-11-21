"use client";

import { useExtracted } from "next-intl";
import { memo, useState, useMemo } from "react";
import { CodeSnippet } from "@/components/CodeSnippet";
import { SegmentedControl } from "@/components/interior/segmented-control";
import { codeGenerators, languageOrder, CodeGenConfig } from "../utils/codeGenerators";

interface CodeExamplesProps {
  config: CodeGenConfig;
}

export const CodeExamples = memo(function CodeExamples({ config }: CodeExamplesProps) {
  const t = useExtracted();
  const [selectedLang, setSelectedLang] = useState("cURL");

  // Memoize the code generation
  const code = useMemo(() => codeGenerators[selectedLang]?.(config) || "", [selectedLang, config]);

  const language = useMemo(() => getLanguageForHighlight(selectedLang), [selectedLang]);

  return (
    <div className="space-y-2">
      {/* Language picker. Nine languages outgrow a narrow column, so the row
          scrolls sideways rather than clipping. */}
      <div className="overflow-x-auto">
        <SegmentedControl
          aria-label={t("Language")}
          size="sm"
          options={languageOrder.map(lang => ({ value: lang, label: lang }))}
          value={selectedLang}
          onValueChange={setSelectedLang}
        />
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
