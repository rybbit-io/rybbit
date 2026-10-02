import { Mail, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { initials } from "./siteAccess";

const SIZES = {
  md: "size-7 text-[11px]",
  sm: "size-6 text-[10px]",
  xs: "size-5 text-[9px]",
};

const AVATAR =
  "inline-grid shrink-0 place-items-center rounded-full border font-semibold select-none border-neutral-150 bg-neutral-50 text-neutral-600 dark:border-neutral-750 dark:bg-neutral-850 dark:text-neutral-300";

type Person = { name?: string | null; email?: string | null };

/** A person's initials in a small circle. Decorative: the name is always written next to it or in the stack's label. */
export function PersonAvatar({ person, size = "sm" }: { person: Person; size?: keyof typeof SIZES }) {
  return (
    <span aria-hidden="true" className={cn(AVATAR, SIZES[size])}>
      {initials(person.name, person.email)}
    </span>
  );
}

/** The first few people of a group side by side; hovering shows everyone's name. */
export function AvatarStack({
  people,
  max,
  size = "sm",
}: {
  people: Person[];
  max: number;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={people.map(person => person.name || person.email).join(", ")}
    >
      {people.slice(0, max).map((person, index) => (
        <PersonAvatar key={index} person={person} size={size} />
      ))}
    </span>
  );
}

/** The placeholder avatar for a group with nobody in it yet. */
export function EmptyAvatar() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        AVATAR,
        SIZES.sm,
        "border-dashed bg-transparent text-neutral-400 dark:bg-transparent dark:text-neutral-500"
      )}
    >
      <Plus className="size-3" />
    </span>
  );
}

/** Someone invited but not yet joined: a dashed outline with an envelope. */
export function InvitationAvatar({ size = "md" }: { size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        AVATAR,
        SIZES[size],
        "border-dashed bg-transparent text-neutral-400 dark:bg-transparent dark:text-neutral-500"
      )}
    >
      <Mail className="size-3.5" />
    </span>
  );
}
