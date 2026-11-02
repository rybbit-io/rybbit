/**
 * The slug for a new organization named `name`. Slugs are unique across every
 * organization, so a bare "test" collides with someone else's, and a name with
 * no ASCII letters or digits ("测试") strips to nothing. A fallback base and a
 * short random suffix keep it valid; the display name is saved as typed.
 */
export function slugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "org"}-${Math.random().toString(36).slice(2, 6)}`;
}
