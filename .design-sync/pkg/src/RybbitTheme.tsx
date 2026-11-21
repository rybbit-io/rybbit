"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface RybbitThemeProps {
  /** Rybbit is dark-mode-first; "light" mirrors every token. */
  theme?: "dark" | "light";
  className?: string;
  children?: React.ReactNode;
}

/**
 * Root wrapper for anything built with the Rybbit UI kit. Mirrors the app's
 * root layout + Providers: the theme class on <html> (tokens live on `.dark` /
 * `:root`, and portalled overlays read it from there), the canvas colours on
 * <body>, the Inter font stack, next-themes context (CardLoader / Toaster
 * read `useTheme`), and the TooltipProvider that Radix tooltips require.
 */
export function RybbitTheme({ theme = "dark", className, children }: RybbitThemeProps) {
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    // Inline styles: the host page may paint <body> with an unlayered rule
    // that beats layered utility classes.
    document.body.style.backgroundColor = "var(--color-background)";
    document.body.style.color = "var(--color-foreground)";
  }, [theme]);
  return (
    <ThemeProvider attribute="class" forcedTheme={theme} enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        <div
          data-rybbit-theme={theme}
          className={cn("rybbit-theme bg-background text-foreground", theme === "dark" && "dark", className)}
        >
          {children}
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
