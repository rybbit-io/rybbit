import Image from "next/image";

export function RybbitLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  return <Image src="/rybbit.svg" alt="Rybbit" width={width} height={height} className="invert dark:invert-0" />;
}

export function RybbitTextLogo({ width = 150, height = 34 }: { width?: number; height?: number }) {
  return <Image src="/rybbit-text.svg" alt="Rybbit" width={width} height={height} className="dark:invert-0 invert" />;
}
