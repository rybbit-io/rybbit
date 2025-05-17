"use client";

import { useEffect } from "react";
import { highlightCode } from "../lib/highlightCode";

export default function CodeHighlighter() {
  useEffect(() => {
    highlightCode();
  }, []);

  return null; // This component doesn't render anything
}
