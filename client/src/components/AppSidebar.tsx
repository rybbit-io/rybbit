"use client";

import { BookOpen, Building2, HelpCircle, LogOut, Settings, ShieldUser, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExtracted } from "next-intl";
import { Suspense, useState } from "react";
import { useEmbedablePage } from "../app/[site]/utils";
import { useAdminPermission } from "../app/admin/hooks/useAdminPermission";
import { useSignout } from "../hooks/useSignout";
import { authClient } from "../lib/auth";
import { IS_CLOUD } from "../lib/const";
import { useStripeSubscription } from "../lib/subscription/useStripeSubscription";
import { cn } from "../lib/utils";
import { RybbitLogo } from "./RybbitLogo";
import { ThemeSwitcher } from "./ThemeSwitcher";

function AdminLink({ isExpanded }: { isExpanded: boolean }) {
  const pathname = usePathname();
  const { isAdmin } = useAdminPermission();
  const t = useExtracted();
  if (!IS_CLOUD || !isAdmin) return null;

  return (
    <SidebarLink
      href="/admin"
      icon={<ShieldUser className="w-5 h-5" />}
      label={t("Admin")}
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
  const signout = useSignout();
  const t = useExtracted();

  const { data: subscription } = useStripeSubscription();

  if (embed) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between h-dvh p-2 py-3 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-850 gap-3 transition-all duration-200",
        isExpanded ? "w-44" : "w-[45px]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex flex-col items-start gap-2">
        <Link href="/" className="mb-2 mt-1 ml-0.5 flex items-center justify-center">
          <RybbitLogo width={24} height={18} />
        </Link>
        <SidebarLink
          href="https://rybbit.com/docs"
          icon={<BookOpen className="w-5 h-5" />}
          label={t("Documentation")}
          target="_blank"
          active={false}
          expanded={isExpanded}
        />
        {
          IS_CLOUD && (subscription?.status === "active" || subscription?.status === "trialing") && <SidebarLink
            href="mailto:hello@rybbit.com"
            icon={<HelpCircle className="w-5 h-5" />}
            label={t("Email Support")}
            target="_blank"
            active={false}
            expanded={isExpanded}
          />
        }
        {session?.user.role === "admin" && <AdminLink isExpanded={isExpanded} />}
      </div>
      <div className="flex flex-col items-start gap-2 w-full">
        <div className={cn("flex items-center w-full px-0.5", isExpanded ? "justify-start" : "hidden")}>
          <ThemeSwitcher />
        </div>

        {isExpanded ? (
          <>
            <SidebarLink
              href="/settings/account"
              icon={<User className="w-5 h-5" />}
              label={t("Account")}
              active={pathname.startsWith("/settings/account")}
              expanded={isExpanded}
            />
            <SidebarLink
              href="/settings/organization"
              icon={<Building2 className="w-5 h-5" />}
              label={t("Organization")}
              active={pathname.startsWith("/settings/organization")}
              expanded={isExpanded}
            />
            <SidebarLink
              onClick={signout}
              icon={<LogOut className="w-5 h-5" />}
              label={t("Sign out")}
              expanded={isExpanded}
            />
          </>
        ) : (
          <div
            className={cn(
              "p-1 rounded-md transition-all duration-200 flex items-center gap-2",
              "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-150 dark:hover:bg-neutral-800/80"
            )}
          >
            <div className="flex items-center justify-center w-5 h-5 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
          </div>
        )}
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
  onClick,
  target,
}: {
  active?: boolean;
  href?: string;
  icon?: React.ReactNode;
  label?: string;
  expanded?: boolean;
  onClick?: () => void;
  target?: string;
}) {
  if (!href) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-1 rounded-md transition-all duration-200 flex items-center gap-2",
          "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-150 dark:hover:bg-neutral-800/80"
        )}
      >
        <div className="flex items-center justify-center w-5 h-5 shrink-0">{icon}</div>
        {expanded && label && (
          <span className="text-sm font-medium whitespace-nowrap overflow-hidden w-[120px]">{label}</span>
        )}
      </div>
    );
  }

  return (
    <Link href={href} className="focus:outline-none" target={target}>
      <div
        className={cn(
          "p-1 rounded-md transition-all duration-200 flex items-center gap-2",
          active
            ? "bg-neutral-150 dark:bg-neutral-800 text-neutral-800 dark:text-white"
            : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-150 dark:hover:bg-neutral-800/80"
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
