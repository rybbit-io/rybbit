export interface IdentifyTraitRow {
  key: string;
  value: string;
}

export type IdentifyTraitRowError = "missing-key" | "duplicate-key";

interface BuildIdentifyTraitsResult {
  traits: Record<string, unknown>;
  errors: Partial<Record<number, IdentifyTraitRowError>>;
}

function parseTraitValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

export function buildIdentifyTraits(name: string, email: string, rows: IdentifyTraitRow[]): BuildIdentifyTraitsResult {
  const traits: Record<string, unknown> = {};
  const errors: Partial<Record<number, IdentifyTraitRowError>> = {};
  const seenKeys = new Set<string>();

  const trimmedName = name.trim();
  if (trimmedName) {
    traits.name = trimmedName;
    seenKeys.add("name");
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail) {
    traits.email = trimmedEmail;
    seenKeys.add("email");
  }

  rows.forEach((row, index) => {
    const key = row.key.trim();
    if (!key && !row.value.trim()) return;

    if (!key) {
      errors[index] = "missing-key";
      return;
    }

    if (seenKeys.has(key)) {
      errors[index] = "duplicate-key";
      return;
    }

    seenKeys.add(key);
    traits[key] = parseTraitValue(row.value);
  });

  return { traits, errors };
}
