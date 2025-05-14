import { Tilt_Warp } from "next/font/google";
import Image from "next/image";
import { cn } from "../lib/utils";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export function Logo({
  size = "small",
}: {
  size?: "small" | "medium" | "large" | "xlarge" | "xxlarge";
}) {
  if (size === "small") {
    return (
      <div
        className={cn("flex items-center gap-1.5 text-lg", tilt_wrap.className)}
      >
        <Image src="/rybbit.png" alt="Rybbit" width={22} height={22} />
        rybbit.
      </div>
    );
  }

  if (size === "medium") {
    return (
      <div
        className={cn("flex items-center gap-1.5 text-xl", tilt_wrap.className)}
      >
        <Image src="/rybbit.png" alt="Rybbit" width={24} height={24} />
        rybbit.
      </div>
    );
  }

  if (size === "large") {
    return (
      <div
        className={cn("flex items-center gap-1.5 text-2xl", tilt_wrap.className)}
      >
        <Image src="/rybbit.png" alt="Rybbit" width={27} height={27} />
        rybbit.
      </div>
    );
  }

  if (size === "xlarge") {
    return (
      <div
        className={cn("flex items-center gap-2 text-3xl", tilt_wrap.className)}
      >
        <Image src="/rybbit.png" alt="Rybbit" width={34} height={34} />
        rybbit.
      </div>
    );
  }

  if (size === "xxlarge") {
    return (
      <div
        className={cn("flex items-center gap-2 text-4xl", tilt_wrap.className)}
      >
        <Image src="/rybbit.png" alt="Rybbit" width={38} height={38} />
        rybbit.
      </div>
    );
  }
}
