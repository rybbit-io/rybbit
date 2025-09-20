import Link from "next/link";

export function Footer() {
  const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <div className="flex justify-center items-center h-12 text-neutral-400 gap-4 text-xs">
      <p>© 2025 Rybbit</p>
      <Link
        href={`https://github.com/rybbit-io/rybbit/releases/tag/v${APP_VERSION}`}
        className="hover:text-neutral-300"
      >
        v{APP_VERSION}
      </Link>
      <Link href="https://rybbit.io/docs" className="hover:text-neutral-300">
        Docs
      </Link>
      <Link href="https://github.com/rybbit-io/rybbit" className="hover:text-neutral-300">
        Github
      </Link>
    </div>
  );
}
