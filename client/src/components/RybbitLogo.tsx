import Image from "next/image";
import { useEffect, useState } from "react";
import { useWhiteLabel } from "../hooks/useIsWhiteLabel";
import { Skeleton } from "./ui/skeleton";

const HORIZONTAL_LOGO_ASPECT_RATIO = 500 / 100.27;

function getTextLogoHeight(width: number, height?: number) {
  return height && height > 0 ? height : Math.round(width / HORIZONTAL_LOGO_ASPECT_RATIO);
}

export function RybbitLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();
  const [mounted, setMounted] = useState(false);
  const imageStyle = { width, height, objectFit: "contain" as const };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <Skeleton style={{ width, height }} />;
  }

  if (whiteLabelImage) {
    return <Image src={whiteLabelImage} alt="Rybbit" width={width} height={height} style={imageStyle} />;
  }

  return (
    <Image
      src="/rybbit/frog_white.svg"
      alt="Rybbit"
      width={width}
      height={height}
      style={imageStyle}
      className="invert dark:invert-0"
    />
  );
}

export function RybbitTextLogo({ width = 150, height }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();
  const [mounted, setMounted] = useState(false);
  const resolvedHeight = getTextLogoHeight(width, height);
  const imageStyle = { width, height: resolvedHeight, objectFit: "contain" as const };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <Skeleton style={{ width, height: resolvedHeight }} />;
  }

  if (whiteLabelImage) {
    return (
      <Image
        src={whiteLabelImage}
        alt="Rybbit"
        width={width}
        height={resolvedHeight}
        style={imageStyle}
        loading="eager"
      />
    );
  }

  return (
    <Image
      src="/rybbit/horizontal_white.svg"
      alt="Rybbit"
      width={width}
      height={resolvedHeight}
      style={imageStyle}
      loading="eager"
      className="dark:invert-0 invert"
    />
  );
}
