import Link from "next/link";

export function Footer() {
  const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <div className="flex justify-center items-center h-12 text-neutral-400 gap-4 text-xs">
      <p>© 2025 Ajayvision Education Pvt Ltd.</p>
    </div>
  );
}
