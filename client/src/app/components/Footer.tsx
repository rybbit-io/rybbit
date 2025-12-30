import Link from "next/link";
import { IS_CLOUD } from "../../lib/const";
import { useWhiteLabel } from "../../hooks/useIsWhiteLabel";

export function Footer() {
  const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;
  const { isWhiteLabel } = useWhiteLabel();
  if (isWhiteLabel) {
    return null;
  }

  return (
    <div className="flex justify-center items-center h-12 text-neutral-400 gap-4 text-xs">
      <p>© 2025 Rybbit</p>
      <Link
        href={`https://github.com/rybbit-io/rybbit/releases/tag/v${APP_VERSION}`}
        className="hover:text-neutral-300"
      >
        v{APP_VERSION}
      </Link>
      <Link href="https://rybbit.com/docs" className="hover:text-neutral-300">
        Docs
      </Link>
      <Link href="https://github.com/rybbit-io/rybbit" className="hover:text-neutral-300">
        Github
      </Link>
      {IS_CLOUD && (
        <>
          <Link href="https://rybbit.com/contact" className="hover:text-neutral-300">
            Support
          </Link>
          <Link href="https://ipapi.is/" className="hover:text-neutral-300" target="_blank">
            Geolocation by ipapi.is
          </Link>
        </>
      )}
    </div>
  );
}
