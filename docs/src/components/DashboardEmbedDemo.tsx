"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

type Theme = (typeof THEMES)[number]["value"];

function pillClass(active: boolean) {
  return cn(
    "px-3 py-1.5 rounded-md text-sm border transition-colors",
    active
      ? "bg-fd-accent text-fd-accent-foreground border-fd-accent"
      : "bg-transparent border-fd-border text-fd-muted-foreground hover:text-fd-foreground"
  );
}

export function DashboardEmbedDemo() {
  const [origin, setOrigin] = useState("https://app.rybbit.io");
  const [siteId, setSiteId] = useState("YOUR_SITE_ID");
  const [privateLinkKey, setPrivateLinkKey] = useState("YOUR_PRIVATE_LINK_KEY");
  const [theme, setTheme] = useState<Theme>("system");
  const [hideSidebar, setHideSidebar] = useState(true);

  const dashboardUrl = useMemo(() => {
    const normalizedOrigin = origin.replace(/\/+$/, "");
    const path = `/${siteId || "YOUR_SITE_ID"}/${privateLinkKey || "YOUR_PRIVATE_LINK_KEY"}/main`;
    const url = new URL(path, normalizedOrigin || "https://app.rybbit.io");
    url.searchParams.set("embed", "true");
    url.searchParams.set("theme", theme);

    if (hideSidebar) {
      url.searchParams.set("hideSidebar", "true");
    }

    return url.toString();
  }, [hideSidebar, origin, privateLinkKey, siteId, theme]);

  const iframeCode = `<iframe
  src="${dashboardUrl}"
  style="border: 0; width: 100%; height: 720px;"
  loading="lazy"
  title="Analytics dashboard"
></iframe>`;

  return (
    <div className="not-prose my-6 space-y-6 rounded-lg border border-fd-border bg-fd-card p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide">Rybbit URL</span>
          <input
            value={origin}
            onChange={event => setOrigin(event.target.value)}
            className="w-full rounded-md border border-fd-border bg-transparent px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide">Site ID</span>
          <input
            value={siteId}
            onChange={event => setSiteId(event.target.value)}
            className="w-full rounded-md border border-fd-border bg-transparent px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide">Private link key</span>
          <input
            value={privateLinkKey}
            onChange={event => setPrivateLinkKey(event.target.value)}
            className="w-full rounded-md border border-fd-border bg-transparent px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide">Theme</h5>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={pillClass(theme === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm">Hide sidebar</span>
        <input
          type="checkbox"
          checked={hideSidebar}
          onChange={event => setHideSidebar(event.target.checked)}
          className="h-4 w-4 accent-emerald-500"
        />
      </label>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide">Private link URL</h5>
        <code className="block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-fd-border bg-fd-background px-2 py-1.5 text-xs">
          {dashboardUrl}
        </code>
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wide">Embed code</h5>
        <pre className="overflow-auto rounded-md border border-fd-border bg-fd-muted/40 p-3 text-xs">
          <code>{iframeCode}</code>
        </pre>
      </div>
    </div>
  );
}
