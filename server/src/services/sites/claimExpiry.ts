// Postgres timestamp (without time zone) strings represent UTC here. Include
// the offset on the wire so browser/server local time zones cannot shift TTLs.
export function claimExpiryIso(value: string | null): string | null {
  if (!value) return null;
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`).toISOString();
}
