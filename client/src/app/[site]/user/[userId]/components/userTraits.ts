// Traits the profile already shows as the user's name and email.
const IDENTITY_TRAITS = ["username", "name", "email"];

// A header chip is one glance: longer values stay in the rail.
const MAX_CHIP_VALUE_LENGTH = 32;

export type TraitEntry = [key: string, value: unknown];

/** Every trait except the identity ones, in stored order. */
export function customTraits(traits: Record<string, unknown> | null | undefined): TraitEntry[] {
  return traits ? Object.entries(traits).filter(([key]) => !IDENTITY_TRAITS.includes(key)) : [];
}

/** "signup_plan" reads as "signup plan"; the row capitalises it. */
export const traitLabel = (key: string) => key.replace(/_/g, " ");

/** A trait value as text. Objects and arrays are shown as JSON rather than "[object Object]". */
export function traitText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/**
 * The few traits worth repeating beside the name: the first `max` that are a
 * short, non-empty string, number or boolean.
 */
export function headlineTraits(traits: Record<string, unknown> | null | undefined, max = 3): TraitEntry[] {
  return customTraits(traits)
    .filter(([, value]) => {
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return false;
      const text = String(value).trim();
      return text.length > 0 && text.length <= MAX_CHIP_VALUE_LENGTH;
    })
    .slice(0, max);
}
