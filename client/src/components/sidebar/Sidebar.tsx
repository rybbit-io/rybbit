"use client";
import Link from "next/link";
import { cn } from "../../lib/utils";

function Root({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-56 bg-neutral-50 border-r border-neutral-150 dark:bg-neutral-900 dark:border-neutral-850 flex flex-col">
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col p-3 pt-4 border-b border-neutral-300 dark:border-neutral-800">
      <div className="text-base text-neutral-900 dark:text-neutral-100 mx-1 font-medium">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-3 mb-1 mx-3 font-medium">{children}</div>;
}

function Items({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col p-3">{children}</div>;
}

// Sidebar Link component
function Item({
  label,
  active = false,
  href,
  icon,
}: {
  label: string;
  active?: boolean;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href} className="focus:outline-none">
      <div
        className={cn(
          "px-3 py-2 rounded-lg transition-colors w-full",
          active
            ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
            : "text-neutral-800 hover:text-neutral-950 hover:bg-neutral-150 dark:text-neutral-200 dark:hover:text-white dark:hover:bg-neutral-800/50"
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
      </div>
    </Link>
  );
}

export const Sidebar = { Root, Title, Item, Items, SectionHeader };
