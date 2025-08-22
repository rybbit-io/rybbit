"use client";

import { BarChart, ShieldUser, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import { useAdminPermission } from "../app/admin/hooks/useAdminPermission";
import { cn } from "../lib/utils";
import { useEmbedablePage } from "../app/[site]/utils";
import { IS_CLOUD } from "../lib/const";

function AppSidebarContent() {
  const pathname = usePathname();
  const { isAdmin } = useAdminPermission();
  const [isExpanded, setIsExpanded] = useState(false);
  const embed = useEmbedablePage();

  if (embed) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between h-dvh p-2 py-3 bg-neutral-900 border-r border-neutral-850 gap-3 transition-all duration-1s00",
        isExpanded ? "w-44" : "w-[45px]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex flex-col items-start gap-2">
        <Link href="/" className="mb-3 mt-1 ml-0.5 flex items-center justify-center">
          <Image src="/rybbit.svg" alt="Rybbit" width={24} height={18} />
        </Link>
        <SidebarLink
          href="/"
          icon={<BarChart className="w-5 h-5" />}
          label="Analytics"
          active={pathname === "/" || !isNaN(Number(pathname.split("/")[1]))}
          expanded={isExpanded}
        />
        {/* <SidebarLink
          href="/uptime/monitors"
          icon={<SquareActivity className="w-5 h-5" />}
          label="Uptime"
          active={pathname.startsWith("/uptime")}
          expanded={isExpanded}
        /> */}
        {isAdmin && IS_CLOUD && (
          <SidebarLink
            href="/admin"
            icon={<ShieldUser className="w-5 h-5" />}
            label="Admin"
            active={pathname.startsWith("/admin")}
            expanded={isExpanded}
          />
        )}
      </div>
      <SidebarLink
        href="/settings/account"
        icon={<User className="w-5 h-5" />}
        label="Account"
        active={pathname.startsWith("/settings/account")}
        expanded={isExpanded}
      />
    </div>
  );
}

export function AppSidebar() {
  return (
    <Suspense fallback={null}>
      <AppSidebarContent />
    </Suspense>
  );
}

function SidebarLink({
  active = false,
  href,
  icon,
  label,
  expanded = false,
}: {
  active?: boolean;
  href: string;
  icon?: React.ReactNode;
  label?: string;
  expanded?: boolean;
}) {
  return (
    <Link href={href} className="focus:outline-none">
      <div
        className={cn(
          "p-1 rounded-md transition-all duration-200 flex items-center gap-2",
          active ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800/80"
          // expanded ? "w-40" : "w-12"
        )}
      >
        <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">{icon}</div>
        {expanded && label && (
          <span className="text-sm font-medium whitespace-nowrap overflow-hidden w-[120px]">{label}</span>
        )}
      </div>
    </Link>
  );
}
