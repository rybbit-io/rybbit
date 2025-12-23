import BoringAvatar from "boring-avatars";
import { DateTime } from "luxon";
import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import { getTimezone } from "../lib/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

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

export function Avatar({ id, size = 20, lastActiveTime }: { id: string; size?: number; lastActiveTime?: DateTime }) {
  const timeSinceEnd = lastActiveTime ? -lastActiveTime.setZone(getTimezone()).diffNow().toMillis() / 1000 : 0;
  const online = lastActiveTime ? timeSinceEnd < 300 : false;
  return (
    <div className="relative">
      <BoringAvatar size={size} name={id} variant="beam" colors={AVATAR_COLORS} />
      {online && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border border-2 border-white dark:border-neutral-900"
              style={{ width: size / 1.7, height: size / 1.7 }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Active {lastActiveTime?.toRelative()}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
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
