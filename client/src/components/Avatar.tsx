import BoringAvatar from "boring-avatars";
import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";

export const AVATAR_COLORS = [
  "#ec4899",
  "#be185d",
  "#f97316",
  "#c2410c",
  "#eab308",
  "#a16207",
  "#10b981",
  "#059669",
  "#14b8a6",
  "#0d9488",
  "#06b6d4",
  "#0e7490",
  "#3b82f6",
  "#1d4ed8",
  "#6366f1",
  "#8b5cf6",
  "#475569",
  "#6b7280",
  "#9ca3af",
  "#d1d5db",
];

export function Avatar({ id, size = 20 }: { id: string; size?: number }) {
  return <BoringAvatar size={size} name={id} variant="beam" colors={AVATAR_COLORS} />;
}

export function generateName(id: string) {
  const name = uniqueNamesGenerator({
    dictionaries: [colors, animals],
    separator: " ",
    style: "capital",
    seed: id,
  });
  return name;
}
