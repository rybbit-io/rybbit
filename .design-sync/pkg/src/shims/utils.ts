// Design-sync shim for client/src/lib/utils. The real module drags in luxon,
// the Avatar component, and the app store; the ui/ primitives only use cn().
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const userLocale = typeof navigator !== "undefined" ? navigator.language : "en-US";

/** Compact number formatter (1.2K, 3.4M) — same as the app's. */
export const formatter = Intl.NumberFormat(userLocale, { notation: "compact" }).format;
