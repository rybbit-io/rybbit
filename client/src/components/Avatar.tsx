import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import { useDateTimeFormat } from "../hooks/useDateTimeFormat";
import { getTimezone } from "../lib/store";
import { FrogAvatar } from "./FrogAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Avatar({ id, size = 20, lastActiveTime }: { id: string; size?: number; lastActiveTime?: DateTime }) {
  const t = useExtracted();
  const { formatRelative } = useDateTimeFormat();
  const timeSinceEnd = lastActiveTime ? -lastActiveTime.setZone(getTimezone()).diffNow().toMillis() / 1000 : 0;
  const online = lastActiveTime ? timeSinceEnd < 300 : false;
  // Half the avatar, ring included: big enough to read, small enough to leave the face alone.
  const dot = Math.max(8, Math.round(size / 2));
  return (
    <div className="relative">
      <FrogAvatar id={id} size={size} />
      {online && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full border-2 border-white dark:border-neutral-900"
              style={{ width: dot, height: dot }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("Active {time}", { time: lastActiveTime ? formatRelative(lastActiveTime) : "" })}</p>
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
