"use client";

import { useEffect } from "react";

// Once per page load, across StrictMode double-invokes and client navs.
let greeted = false;

/**
 * A small hello for people who open devtools — which, for this audience,
 * is a lot of them. Renders nothing; English-only on purpose (it's a
 * console artifact, same convention as untranslated code snippets).
 */
export function ConsoleGreeting() {
  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.log(
      "%c🐸 ribbit. you found the console.\n" +
        "%cThis page is tracked by Rybbit itself: no cookies, no fingerprinting, and every line of it is open source.\n" +
        "%chttps://github.com/rybbit-io/rybbit",
      "color:#10b981;font-size:14px;font-weight:600;line-height:2.2",
      "font-size:12px;line-height:1.7",
      "color:#10b981;font-size:12px;line-height:2"
    );
  }, []);

  return null;
}
