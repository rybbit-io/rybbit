"use client";
import Link from "next/link";
import { cn } from "../../lib/utils";

function Root({ children }: { children: React.ReactNode }) {
  return <div className="w-56 bg-neutral-900 border-r border-neutral-850 flex flex-col">{children}</div>;
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col p-3 pt-4 border-b border-neutral-800">
      <div className="text-base text-neutral-100 mx-1 font-medium">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-neutral-400 mt-3 mb-1 mx-3 font-medium">{children}</div>;
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
          active ? "bg-neutral-800 text-white" : "text-neutral-200 hover:text-white hover:bg-neutral-800/50"
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
