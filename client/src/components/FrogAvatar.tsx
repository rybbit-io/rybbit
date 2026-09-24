import { frogAvatarMarkup } from "../lib/frogAvatar";

export function FrogAvatar({ id, size = 20 }: { id: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      dangerouslySetInnerHTML={{ __html: frogAvatarMarkup(id) }}
    />
  );
}
