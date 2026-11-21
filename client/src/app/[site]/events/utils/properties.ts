import { EventProperty } from "../../../../api/analytics/endpoints";

export type PropertyGroup = {
  key: string;
  /** The key's values, most frequent first. */
  values: EventProperty[];
  /** Events that carried the key: an event has one value per key, so the values add up to it. */
  total: number;
};

/** Property keys by how many events carry them, each key's values by count. */
export function groupProperties(properties: EventProperty[]): PropertyGroup[] {
  const groups = new Map<string, PropertyGroup>();
  for (const property of properties) {
    const key = String(property.propertyKey);
    const group = groups.get(key) ?? { key, values: [], total: 0 };
    group.values.push(property);
    group.total += property.count;
    groups.set(key, group);
  }
  return Array.from(groups.values())
    .map(group => ({ ...group, values: group.values.toSorted((a, b) => b.count - a.count) }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

/** A share as the tables print it: whole percents, one decimal under 10%, and no "100%" short of all of it. */
export function formatShare(fraction: number): string {
  if (fraction >= 1) return "100%";
  const percent = fraction * 100;
  if (percent >= 99.5) return `${Math.min(percent, 99.9).toFixed(1)}%`;
  return `${percent.toFixed(percent < 10 ? 1 : 0)}%`;
}
