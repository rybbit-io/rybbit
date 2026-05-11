import { Widget, WidgetVariant } from "./Widget";

export const dynamic = "force-dynamic";

type SearchParams = {
  minutes?: string;
  chart?: string;
  countries?: string;
  theme?: string;
  accent?: string;
  variant?: string;
};

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { siteId } = await params;
  const sp = await searchParams;

  const minutes = Number(sp.minutes ?? 30);
  const allowedMinutes = new Set([30, 1440, 10080]);
  const safeMinutes = allowedMinutes.has(minutes) ? minutes : 30;
  const chart = sp.chart === "true";
  const countries = sp.countries === "true";
  const theme = sp.theme === "light" ? "light" : "dark";
  const accent = sp.accent && /^[0-9a-fA-F]{6}$/.test(sp.accent) ? `#${sp.accent}` : "#10b981";
  const variant: WidgetVariant = sp.variant === "inline" ? "inline" : "card";

  return (
    <Widget
      siteId={siteId}
      minutes={safeMinutes}
      chart={chart}
      countries={countries}
      theme={theme}
      accent={accent}
      variant={variant}
    />
  );
}
