"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useCallback } from "react";

export function JsonEditor({
  value,
  onChange,
  placeholder,
  height = 140,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number | string;
  ariaLabel?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const handleMount: OnMount = useCallback((editor, monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemaValidation: "error",
    });
    editor.updateOptions({
      lineNumbers: "off",
      minimap: { enabled: false },
      folding: false,
      lineDecorationsWidth: 4,
      lineNumbersMinChars: 0,
      glyphMargin: false,
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      scrollBeyondLastLine: false,
      renderLineHighlight: "none",
      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6, alwaysConsumeMouseWheel: false },
      padding: { top: 8, bottom: 8 },
      fontSize: 12,
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      tabSize: 2,
      contextmenu: false,
      wordWrap: "on",
    });
  }, []);

  return (
    <div
      aria-label={ariaLabel}
      className="overflow-hidden rounded-md border border-neutral-150 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      style={{ height }}
    >
      <Editor
        language="json"
        value={value}
        theme={isDark ? "vs-dark" : "vs"}
        onChange={next => onChange(next ?? "")}
        onMount={handleMount}
        options={{
          placeholder,
        }}
        loading={null}
      />
    </div>
  );
}
