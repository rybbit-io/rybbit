import { useWindowSize } from "@uidotdev/usehooks";
import {
  AlertTriangle,
  AppWindow,
  Bot,
  Building2,
  Calendar,
  ChartColumnDecreasing,
  Code,
  Combine,
  CreditCard,
  Database,
  File,
  Funnel,
  Gauge,
  Globe2,
  Keyboard,
  LayoutDashboard,
  LayoutGrid,
  Monitor,
  Moon,
  MousePointerClick,
  Rewind,
  Split,
  Sun,
  Target,
  User,
  UserCircle,
  Users,
  Video,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useUserOrganizations } from "@/api/admin/hooks/useOrganizations";
import { useGetSite, useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { useGetFunnels } from "@/api/analytics/hooks/funnels/useGetFunnels";
import { useGetGoals } from "@/api/analytics/hooks/goals/useGetGoals";
import { useGetDashboards } from "@/api/analytics/hooks/useDashboards";
import { HOTKEY_FOR_PRESET, PRESET_GROUPS, usePresetLabels } from "@/components/DateSelector/presets";
import { Favicon } from "@/components/Favicon";
import { useAppEnv } from "@/hooks/useIsProduction";
import { authClient } from "@/lib/auth";
import { DEPLOYMENT, IS_CLOUD } from "@/lib/const";
import { getDashboardTimeForRange, setStoredDashboardDefaultTimeRange } from "@/lib/defaultTimeRange";
import { getSiteRouteContext } from "@/lib/siteRoute";
import { useStore, useTimezone } from "@/lib/store";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { getActiveSiteId, getSwitchSitePath, hasDateSelector } from "./routes";
import { showOverlay } from "./store";

export type CommandGroup =
  | "site"
  | "sites"
  | "goals"
  | "funnels"
  | "dashboards"
  | "date"
  | "navigate"
  | "theme"
  | "preferences";

export type PaletteCommand = {
  /** Unique and stable: cmdk tracks the selected row by it. */
  id: string;
  group: CommandGroup;
  label: string;
  /** Extra words the search matches, a little below the label. */
  keywords?: string;
  /** Secondary text beside the label, e.g. a site's domain. */
  hint?: string;
  icon: ReactNode;
  /** Keys that do the same thing outside the palette. */
  shortcut?: string[];
  /** The page, site, range or theme already in effect. */
  current?: boolean;
  run: () => void;
};

/** Rows a data-backed group shows before the user types. Typing searches all of them. */
export const GROUP_LIMITS: Partial<Record<CommandGroup, number>> = { sites: 5, goals: 5, funnels: 5, dashboards: 5 };

const DESKTOP_MIN_WIDTH = 768;

/**
 * Everything the palette can do on the current page, in display order, plus
 * the heading for each group. `entityCommands` (the open site's goals, funnels
 * and dashboards) come from useSiteEntityCommands, which only mounts on a site.
 */
export function usePaletteCommands(entityCommands: PaletteCommand[]): {
  commands: PaletteCommand[];
  groupLabels: Record<CommandGroup, string>;
} {
  const t = useExtracted();
  const router = useRouter();
  const pathname = usePathname();
  const siteId = getActiveSiteId(pathname);
  const { route } = getSiteRouteContext(pathname);

  // The site sidebar's visibility rules, from the same (already cached) queries.
  const { data: siteData } = useGetSite(siteId ?? undefined, { enabled: siteId !== null });
  const site = siteId !== null ? siteData : undefined;
  const { data: subscription, isLoading: isSubscriptionLoading } = useStripeSubscription();
  const appEnv = useAppEnv();
  const { width } = useWindowSize();
  const isDesktop = width === null || width >= DESKTOP_MIN_WIDTH;

  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: orgSites } = useGetSitesFromOrg(activeOrganization?.id);
  const { data: userOrganizations } = useUserOrganizations();
  const role = userOrganizations?.find(org => org.id === activeOrganization?.id)?.role;
  const isAdminOrOwner = role === "admin" || role === "owner";

  const time = useStore(state => state.time);
  const setTime = useStore(state => state.setTime);
  const zone = useTimezone();
  const presetLabels = usePresetLabels();
  const { theme, setTheme } = useTheme();

  const go = (path: string, keepSearch = false) => router.push(keepSearch ? `${path}${window.location.search}` : path);

  const isMobileSite = site?.type === "mobile";
  const canReplay =
    isDesktop &&
    !isMobileSite &&
    !subscription?.planName?.startsWith("appsumo") &&
    !isSubscriptionLoading &&
    appEnv !== "demo";
  const canQuery = IS_CLOUD || !!DEPLOYMENT;

  const sections: { route: string; label: string; icon: ReactNode; keywords?: string; visible?: boolean }[] =
    siteId === null
      ? []
      : [
          { route: "main", label: t("Main"), icon: <LayoutDashboard />, keywords: t("overview dashboard") },
          { route: "pages", label: t("Pages"), icon: <File />, visible: IS_CLOUD },
          { route: "globe", label: t("Globe"), icon: <Globe2 />, keywords: t("map") },
          { route: "bots", label: t("Bots"), icon: <Bot />, visible: IS_CLOUD },
          { route: "sessions", label: t("Sessions"), icon: <Rewind /> },
          { route: "replay", label: t("Replay"), icon: <Video />, keywords: t("recordings"), visible: canReplay },
          { route: "users", label: t("Users"), icon: <User /> },
          { route: "events", label: t("Events"), icon: <MousePointerClick /> },
          { route: "goals", label: t("Goals"), icon: <Target /> },
          { route: "funnels", label: t("Funnels"), icon: <Funnel /> },
          { route: "journeys", label: t("Journeys"), icon: <Split /> },
          { route: "retention", label: t("Retention"), icon: <ChartColumnDecreasing /> },
          { route: "errors", label: t("Errors"), icon: <AlertTriangle /> },
          {
            route: "performance",
            label: t("Performance"),
            icon: <Gauge />,
            keywords: t("web vitals"),
            visible: IS_CLOUD && !isMobileSite,
          },
          { route: "api-playground", label: t("API Playground"), icon: <Code />, visible: isDesktop },
          { route: "query", label: t("Query"), icon: <Database />, keywords: t("SQL"), visible: canQuery },
          { route: "dashboards", label: t("Dashboards"), icon: <LayoutGrid />, visible: canQuery },
        ];

  const sectionCommands: PaletteCommand[] = sections
    .filter(section => section.visible !== false)
    .map(section => ({
      id: `site:${section.route}`,
      group: "site",
      label: section.label,
      keywords: section.keywords,
      icon: section.icon,
      current: route === section.route,
      run: () => go(`/${siteId}/${section.route}`, true),
    }));

  const siteCommands: PaletteCommand[] = (orgSites?.sites ?? [])
    .filter(orgSite => orgSite.siteId !== siteId)
    .map(orgSite => ({
      id: `sites:${orgSite.siteId}`,
      group: "sites",
      label: orgSite.name,
      hint: orgSite.domain !== orgSite.name ? orgSite.domain : undefined,
      keywords: orgSite.domain,
      icon: <Favicon domain={orgSite.domain} className="h-4 w-4 rounded-sm" />,
      // Like the site selector: same section, same time and filters.
      run: () => go(getSwitchSitePath(pathname, orgSite.siteId), siteId !== null),
    }));

  const dateKeyword = t("Date range");
  const dateCommands: PaletteCommand[] = hasDateSelector(pathname)
    ? PRESET_GROUPS.flatMap(group => group.presets).map(preset => {
        const hotkey = HOTKEY_FOR_PRESET[preset];
        return {
          id: `date:${preset}`,
          group: "date",
          label: presetLabels[preset],
          keywords: dateKeyword,
          icon: <Calendar />,
          shortcut: hotkey ? [hotkey.toUpperCase()] : undefined,
          current: time.wellKnown === preset,
          // What DateSelector does for a preset hotkey: remember it as the default, then apply it.
          run: () => {
            setStoredDashboardDefaultTimeRange(preset);
            setTime(getDashboardTimeForRange(preset, zone));
          },
        };
      })
    : [];

  const navigateCommands: PaletteCommand[] = [
    {
      id: "nav:home",
      group: "navigate",
      label: t("Home"),
      keywords: t("sites properties"),
      icon: <AppWindow />,
      current: pathname === "/",
      run: () => go("/"),
    },
    {
      id: "nav:rollup",
      group: "navigate",
      label: t("Rollup"),
      keywords: t("all sites"),
      icon: <Combine />,
      current: pathname.startsWith("/rollup"),
      run: () => go("/rollup"),
    },
    {
      id: "nav:account",
      group: "navigate",
      label: t("Account"),
      keywords: t("settings profile password API keys"),
      icon: <UserCircle />,
      current: pathname.startsWith("/settings/account"),
      run: () => go("/settings/account"),
    },
  ];
  // Same rule as the settings navigation: members can't manage the organization.
  if (isAdminOrOwner) {
    navigateCommands.push(
      {
        id: "nav:organization",
        group: "navigate",
        label: t("Organization"),
        keywords: t("settings members invitations"),
        icon: <Building2 />,
        current: pathname.startsWith("/settings/organization"),
        run: () => go("/settings/organization"),
      },
      {
        id: "nav:teams",
        group: "navigate",
        label: t("Teams"),
        icon: <Users />,
        current: pathname.startsWith("/settings/teams"),
        run: () => go("/settings/teams"),
      }
    );
    if (IS_CLOUD) {
      navigateCommands.push({
        id: "nav:billing",
        group: "navigate",
        label: t("Billing"),
        keywords: t("subscription plan invoices"),
        icon: <CreditCard />,
        current: pathname.startsWith("/settings/billing"),
        run: () => go("/settings/billing"),
      });
    }
  }

  const themeKeyword = t("Theme");
  const themeCommands: PaletteCommand[] = [
    { value: "light", label: t("Light"), icon: <Sun /> },
    { value: "dark", label: t("Dark"), icon: <Moon /> },
    { value: "system", label: t("System"), icon: <Monitor /> },
  ].map(option => ({
    id: `theme:${option.value}`,
    group: "theme",
    label: option.label,
    keywords: themeKeyword,
    icon: option.icon,
    current: theme === option.value,
    run: () => setTheme(option.value),
  }));

  const preferenceCommands: PaletteCommand[] = [
    {
      id: "pref:shortcuts",
      group: "preferences",
      label: t("Keyboard shortcuts"),
      keywords: t("hotkeys help"),
      icon: <Keyboard />,
      shortcut: ["?"],
      run: () => showOverlay("shortcuts"),
    },
  ];

  return {
    commands: [
      ...sectionCommands,
      ...siteCommands,
      ...entityCommands,
      ...dateCommands,
      ...navigateCommands,
      ...themeCommands,
      ...preferenceCommands,
    ],
    groupLabels: {
      site: site?.name ?? t("This site"),
      sites: siteId === null ? t("Sites") : t("Switch site"),
      goals: t("Goals"),
      funnels: t("Funnels"),
      dashboards: t("Dashboards"),
      date: dateKeyword,
      navigate: t("Navigate"),
      theme: themeKeyword,
      preferences: t("Preferences"),
    },
  };
}

/**
 * The open site's goals, funnels and dashboards. Mounted only inside the open
 * palette on a site page, so these lists are fetched only while it is open.
 */
export function useSiteEntityCommands(siteId: number): PaletteCommand[] {
  const t = useExtracted();
  const router = useRouter();
  const pathname = usePathname();

  // The goals endpoint caps a page at 100.
  const { data: goals } = useGetGoals({ pageSize: 100 });
  const { data: funnels } = useGetFunnels(siteId);
  const { data: dashboards } = useGetDashboards(IS_CLOUD || DEPLOYMENT ? siteId : undefined);

  // Keep the time and filters, like the sidebar links do.
  const go = (path: string) => router.push(`${path}${window.location.search}`);

  const goalsKeyword = t("Goals");
  const funnelsKeyword = t("Funnels");
  const dashboardsKeyword = t("Dashboards");

  const goalCommands: PaletteCommand[] = (goals?.data ?? []).map(goal => {
    const pattern =
      goal.goalType === "path"
        ? goal.config.pathPattern
        : goal.goalType === "event"
          ? goal.config.eventName
          : goal.config.valuePattern;

    return {
      id: `goal:${goal.goalId}`,
      group: "goals",
      label: goal.name || t("Goal #{goalId}", { goalId: String(goal.goalId) }),
      hint: pattern || undefined,
      keywords: pattern ? `${goalsKeyword} ${pattern}` : goalsKeyword,
      icon: <Target />,
      run: () => go(`/${siteId}/goals`),
    };
  });

  const funnelCommands: PaletteCommand[] = (funnels ?? []).map(funnel => ({
    id: `funnel:${funnel.id}`,
    group: "funnels",
    label: funnel.name,
    hint: t("{count, plural, one {# step} other {# steps}}", { count: funnel.steps.length }),
    keywords: funnelsKeyword,
    icon: <Funnel />,
    run: () => go(`/${siteId}/funnels`),
  }));

  const dashboardCommands: PaletteCommand[] = (dashboards ?? []).map(dashboard => {
    const path = `/${siteId}/dashboards/${dashboard.dashboardId}`;
    return {
      id: `dashboard:${dashboard.dashboardId}`,
      group: "dashboards",
      label: dashboard.name,
      keywords: dashboardsKeyword,
      icon: <LayoutGrid />,
      current: pathname === path,
      run: () => go(path),
    };
  });

  return [...goalCommands, ...funnelCommands, ...dashboardCommands];
}
