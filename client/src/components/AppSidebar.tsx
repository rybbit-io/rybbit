"use client";

import { BookOpen, Building2, HelpCircle, LogOut, Moon, ShieldUser, Sun, User } from "lucide-react";
import { useExtracted } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { useEmbedablePage } from "../app/[site]/utils";
import { useAdminPermission } from "../app/admin/hooks/useAdminPermission";
import { useSignout } from "../hooks/useSignout";
import { authClient } from "../lib/auth";
import { DEPLOYMENT, IS_CLOUD } from "../lib/const";
import { useStripeSubscription } from "../lib/subscription/useStripeSubscription";
import { cn } from "../lib/utils";
import { RybbitLogo } from "./RybbitLogo";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function AdminLink() {
  const pathname = usePathname();
  const { isAdmin } = useAdminPermission();
  const t = useExtracted();
  if ((!IS_CLOUD && !DEPLOYMENT) || !isAdmin) return null;

  return (
    <RailLink
      href="/admin"
      icon={<ShieldUser className="w-5 h-5" />}
      label={t("Admin")}
      active={pathname.startsWith("/admin")}
    />
  );
}

function AppSidebarContent() {
  const { data: session } = authClient.useSession();
  const embed = useEmbedablePage();
  const t = useExtracted();

  const { data: subscription } = useStripeSubscription();

  if (embed) return null;

  return (
    <div className="flex flex-col items-center justify-between h-dvh w-[45px] shrink-0 p-2 py-3 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-850 gap-3">
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/"
          aria-label="Rybbit"
          className="mb-2 mt-1 flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300"
        >
          <RybbitLogo width={24} height={18} />
        </Link>
        <RailLink
          href="https://rybbit.com/docs"
          icon={<BookOpen className="w-5 h-5" />}
          label={t("Documentation")}
          target="_blank"
        />
        {IS_CLOUD && (subscription?.status === "active" || subscription?.status === "trialing") && (
          <RailLink
            href="mailto:hello@rybbit.com"
            icon={<HelpCircle className="w-5 h-5" />}
            label={t("Email Support")}
            target="_blank"
          />
        )}
        {session?.user.role === "admin" && <AdminLink />}
      </div>
      <UserMenu name={session?.user.name} email={session?.user.email} image={session?.user.image} />
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

function RailLink({
  active = false,
  href,
  icon,
  label,
  target,
}: {
  active?: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
  target?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          target={target}
          aria-label={label}
          className={cn(
            "p-1 rounded-md transition-colors flex items-center justify-center",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300",
            active
              ? "bg-neutral-150 dark:bg-neutral-800 text-neutral-800 dark:text-white"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-150 dark:hover:bg-neutral-800/80"
          )}
        >
          {icon}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function getInitials(name?: string | null, email?: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/);
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  return email?.trim()[0]?.toUpperCase() ?? "";
}

const MENU_ROW = cn(
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer",
  "hover:bg-neutral-100 dark:hover:bg-neutral-800",
  "focus-visible:outline-none focus-visible:bg-neutral-100 dark:focus-visible:bg-neutral-800"
);

function MenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-neutral-100 dark:bg-neutral-800" />;
}

function ThemeRow() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useExtracted();
  const isDark = resolvedTheme === "dark";

  return (
    <button type="button" className={MENU_ROW} onClick={() => setTheme(isDark ? "light" : "dark")}>
      {isDark ? <Moon className="w-4 h-4 shrink-0" /> : <Sun className="w-4 h-4 shrink-0" />}
      {t("Theme")}
      <span className="ml-auto text-xs text-neutral-600 dark:text-neutral-400">{isDark ? t("Dark") : t("Light")}</span>
    </button>
  );
}

function UserMenu({ name, email, image }: { name?: string | null; email?: string | null; image?: string | null }) {
  const signout = useSignout();
  const t = useExtracted();
  const initials = getInitials(name, email);

  const [open, setOpen] = useState(false);
  // True while the menu is only open because of hover: focus must not move,
  // and mouse-leave is allowed to close it. Click/keyboard opens "pin" it instead.
  const hoverOpenRef = useRef(false);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };
  const hoverOpen = () => {
    clearTimers();
    if (open) return;
    openTimer.current = setTimeout(() => {
      hoverOpenRef.current = true;
      setOpen(true);
    }, 100);
  };
  const hoverClose = () => {
    clearTimers();
    if (!hoverOpenRef.current) return;
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };
  const close = () => {
    clearTimers();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={value => {
        // Click / keyboard / Escape / outside interactions come through here
        clearTimers();
        hoverOpenRef.current = false;
        setOpen(value);
      }}
    >
      <PopoverTrigger asChild>
        <button
          aria-label={name || email || t("Account")}
          onMouseEnter={hoverOpen}
          onMouseLeave={hoverClose}
          onClick={e => {
            clearTimers();
            if (open && hoverOpenRef.current) {
              // Clicking a hover-opened menu pins it instead of toggling it closed
              e.preventDefault();
              hoverOpenRef.current = false;
            }
          }}
          className={cn(
            "w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none",
            "bg-neutral-200 dark:bg-neutral-750 text-neutral-700 dark:text-neutral-200 text-[11px] font-semibold",
            "ring-neutral-300 dark:ring-neutral-600 transition-shadow hover:ring-2 data-[state=open]:ring-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300"
          )}
        >
          {image ? (
            <img src={image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : initials ? (
            initials
          ) : (
            <User className="w-4 h-4" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-60 rounded-lg p-1 shadow-2xl dark:border-neutral-750 dark:bg-neutral-850"
        onMouseEnter={clearTimers}
        onMouseLeave={hoverClose}
        onOpenAutoFocus={e => {
          // Radix skips anchor tags when auto-focusing, so place focus manually;
          // on hover-open, focus must stay wherever the user has it
          e.preventDefault();
          if (!hoverOpenRef.current) firstItemRef.current?.focus();
        }}
        onCloseAutoFocus={e => {
          if (hoverOpenRef.current) e.preventDefault();
        }}
      >
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          {name && <span className="text-sm font-medium truncate text-neutral-900 dark:text-neutral-50">{name}</span>}
          {email && <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{email}</span>}
        </div>
        <MenuSeparator />
        <Link href="/settings/account" className={MENU_ROW} onClick={close} ref={firstItemRef}>
          <User className="w-4 h-4 shrink-0" />
          {t("Account")}
        </Link>
        <Link href="/settings/organization" className={MENU_ROW} onClick={close}>
          <Building2 className="w-4 h-4 shrink-0" />
          {t("Organization")}
        </Link>
        <ThemeRow />
        <MenuSeparator />
        <button
          type="button"
          className={MENU_ROW}
          onClick={() => {
            close();
            signout();
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {t("Sign out")}
        </button>
      </PopoverContent>
    </Popover>
  );
}
