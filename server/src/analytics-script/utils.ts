/**
 * Convert wildcard pattern to regex
 */
export function patternToRegex(pattern: string): RegExp {
  const DOUBLE_WILDCARD_TOKEN = "__DOUBLE_ASTERISK_TOKEN__";
  const SINGLE_WILDCARD_TOKEN = "__SINGLE_ASTERISK_TOKEN__";

  // Replace wildcards with tokens
  let tokenized = pattern.replace(/\*\*/g, DOUBLE_WILDCARD_TOKEN).replace(/\*/g, SINGLE_WILDCARD_TOKEN);

  // Escape special regex characters (except our tokens)
  let escaped = tokenized.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

  // Handle ** patterns specially before escaping slashes
  // Replace /**/ with a pattern that matches / or /anything/
  escaped = escaped.replace(new RegExp(`/${DOUBLE_WILDCARD_TOKEN}/`, "g"), "/(?:.+/)?");

  // Replace remaining ** (at start or end)
  escaped = escaped.replace(new RegExp(DOUBLE_WILDCARD_TOKEN, "g"), ".*");

  // Now escape forward slashes
  escaped = escaped.replace(/\//g, "\\/");

  // Replace single wildcards
  let regexPattern = escaped.replace(new RegExp(SINGLE_WILDCARD_TOKEN, "g"), "[^/]+");

  return new RegExp("^" + regexPattern + "$");
}

/**
 * Find matching pattern from a list of patterns
 */
export function findMatchingPattern(path: string, patterns: string[]): string | null {
  for (const pattern of patterns) {
    try {
      const regex = patternToRegex(pattern);
      if (regex.test(path)) {
        return pattern;
      }
    } catch (e) {
      console.error(`Invalid pattern: ${pattern}`, e);
    }
  }
  return null;
}

/**
 * Debounce function implementation
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if a URL is an outbound link
 */
export function isOutboundLink(url: string): boolean {
  try {
    const currentHost = window.location.hostname;
    const linkHost = new URL(url).hostname;
    return linkHost !== currentHost && linkHost !== "";
  } catch (e) {
    return false;
  }
}

/**
 * Parse JSON safely with fallback
 */
export function parseJsonSafely<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed;
  } catch (e) {
    console.error("Error parsing JSON:", e);
    return fallback;
  }
}
