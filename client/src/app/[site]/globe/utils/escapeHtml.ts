const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes a value for use in an HTML string, as text or inside a quoted
 * attribute. The map tooltips are assembled as HTML strings (Mapbox setHTML,
 * OpenLayers innerHTML), and much of what they show — referrer, city, browser —
 * is whatever a visitor's request or an import file said it was.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}
