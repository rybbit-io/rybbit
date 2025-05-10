import { Tilt_Warp } from "next/font/google";
import Image from 'next/image';
import { cn } from '../../lib/utils';

const tilt_wrap = Tilt_Warp({
    subsets: ["latin"],
    weight: "400",
  });

export function Logo() {
  return (
    <div className={cn("text-4xl flex items-center gap-3", tilt_wrap.className)}>
        <Image src="/rybbit.png" alt="Rybbit" width={40} height={40} />
        rybbit.
    </div>
  );
}

export function SmallLogo() {
  return (
    <div className={cn("text-2xl flex items-center gap-1.5", tilt_wrap.className)}>
      <Image src="/rybbit.png" alt="Rybbit" width={32} height={32} />
      rybbit.
    </div>
  );
}
