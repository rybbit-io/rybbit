import Image from "next/image";
import { useWhiteLabel } from "../hooks/useIsWhiteLabel";
import { Skeleton } from "./ui/skeleton";

export function RybbitLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();

  if (isPending) {
    return <Skeleton style={{ width, height }} />;
  }

  if (whiteLabelImage) {
    return <Image src={whiteLabelImage} alt="Rybbit" width={width} height={height} />;
  }

  return (
    <Image
      src={whiteLabelImage || "/rybbit.svg"}
      alt="Rybbit"
      width={width}
      height={height}
      className="invert dark:invert-0"
    />
  );
}

export function RybbitTextLogo({ width = 150, height = 34 }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();
  if (isPending) {
    return <Skeleton style={{ width, height }} />;
  }

  if (whiteLabelImage) {
    return <Image src={whiteLabelImage} alt="Rybbit" width={width} height={height} />;
  }

  return (
    <Image
      src={whiteLabelImage || "/rybbit-text.svg"}
      alt="Rybbit"
      width={width}
      height={height}
      className="dark:invert-0 invert"
    />
  );
}
