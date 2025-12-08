"use client";

import { usePlaygroundStore } from "../hooks/usePlaygroundStore";
import { useState, useRef } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import { vs2015, vs } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useTheme } from "next-themes";

SyntaxHighlighter.registerLanguage("json", json);

export function RequestBodyEditor() {
  const { requestBody, setRequestBody } = usePlaygroundStore();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleChange = (value: string) => {
    setRequestBody(value);
    if (value.trim() === "") {
      setError(null);
      return;
    }
    try {
      JSON.parse(value);
      setError(null);
    } catch {
      setError("Invalid JSON");
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Request Body (JSON)</label>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      <div
        className="relative min-h-[120px] rounded border border-neutral-150 dark:border-neutral-800 overflow-hidden"
        onClick={() => textareaRef.current?.focus()}
      >
        <SyntaxHighlighter
          language="json"
          style={isDark ? vs2015 : vs}
          customStyle={{
            margin: 0,
            padding: "10px",
            fontSize: "12px",
            minHeight: "120px",
            background: "transparent",
          }}
          wrapLongLines
        >
          {requestBody || " "}
        </SyntaxHighlighter>
        <textarea
          ref={textareaRef}
          value={requestBody}
          onChange={e => handleChange(e.target.value)}
          placeholder='{"key": "value"}'
          className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-black dark:caret-white p-[10px] font-mono text-xs outline-none placeholder:text-neutral-500"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
