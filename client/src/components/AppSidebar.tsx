"use client";

import { BarChart, ShieldUser, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { useEmbedablePage } from "../app/[site]/utils";
import { useAdminPermission } from "../app/admin/hooks/useAdminPermission";
import { IS_CLOUD } from "../lib/const";
import { cn } from "../lib/utils";
import { RybbitLogo } from "./RybbitLogo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { authClient } from "../lib/auth";

function AdminLink({ isExpanded }: { isExpanded: boolean }) {
  const pathname = usePathname();
  const { isAdmin } = useAdminPermission();
  if (!IS_CLOUD || !isAdmin) return null;

  return (
    <SidebarLink
      href="/admin"
      icon={<ShieldUser className="w-5 h-5" />}
      label="Admin"
      active={pathname.startsWith("/admin")}
      expanded={isExpanded}
    />
  );
}

function AppSidebarContent() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const embed = useEmbedablePage();

  if (embed) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between h-dvh p-2 py-3 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-850 gap-3 transition-all duration-1s00",
        isExpanded ? "w-44" : "w-[45px]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex flex-col items-start gap-2">
        <Link href="/" className="mb-3 mt-1 ml-0.5 flex items-center justify-center">
          <RybbitLogo width={24} height={18} />
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
        {session?.user.role === "admin" && <AdminLink isExpanded={isExpanded} />}
      </div>
      <div className="flex flex-col items-start gap-2 w-full">
        <div className={cn("flex items-center w-full px-0.5", isExpanded ? "justify-start" : "hidden")}>
          <ThemeSwitcher />
        </div>
        <SidebarLink
          href="/settings/account"
          icon={<User className="w-5 h-5" />}
          label="Account"
          active={pathname.startsWith("/settings/account")}
          expanded={isExpanded}
        />
      </div>
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
          active
            ? "bg-neutral-150 dark:bg-neutral-800 text-neutral-800 dark:text-white"
            : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-150 dark:hover:bg-neutral-800/80"
          // expanded ? "w-40" : "w-12"
        )}
      >
        <div className="flex items-center justify-center w-5 h-5 shrink-0">{icon}</div>
        {expanded && label && (
          <span className="text-sm font-medium whitespace-nowrap overflow-hidden w-[120px]">{label}</span>
        )}
      </div>
    </Link>
  );
}
