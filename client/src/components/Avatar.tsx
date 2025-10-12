import BoringAvatar from "boring-avatars";
import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";

export function Avatar({ id, size = 20 }: { id: string; size?: number }) {
  return (
    <BoringAvatar
      size={size}
      name={id}
      variant="beam"
      colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
    />
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
