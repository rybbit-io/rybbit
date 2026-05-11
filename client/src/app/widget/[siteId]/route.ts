import { NextRequest } from "next/server";

const ALLOWED_MINUTES = new Set([30, 1440, 10080]);

const MINUTES_LABEL: Record<number, string> = {
  30: "LAST 30 MINUTES",
  1440: "LAST 24 HOURS",
  10080: "LAST 7 DAYS",
};

function getBackendUrl() {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
  return raw === "http://localhost:3001" ? "http://localhost:3001/api" : `${raw}/api`;
}

interface Config {
  siteId: string;
  minutes: number;
  chart: boolean;
  countries: boolean;
  theme: "dark" | "light";
  accent: string;
  variant: "card" | "inline";
  backendUrl: string;
  windowLabel: string;
}

function colors(theme: "dark" | "light") {
  return theme === "dark"
    ? { bg: "#171717", fg: "#fafafa", muted: "#737373", border: "rgba(255,255,255,0.08)" }
    : { bg: "#ffffff", fg: "#171717", muted: "#737373", border: "rgba(0,0,0,0.08)" };
}

function renderCardHTML(c: Config) {
  const col = colors(c.theme);
  const logo = c.theme === "dark" ? "/rybbit/horizontal_white.svg" : "/rybbit/horizontal_black.svg";
  return `
<div class="w card">
  <div class="header">
    <div class="header-left"><span class="pulse pulse-md"></span> VISITORS</div>
    <span class="count" id="count">—</span>
  </div>
  ${c.chart ? `<div class="chart" id="chart"></div>` : ""}
  <div class="window-label">${c.windowLabel}</div>
  ${c.countries ? `<div class="countries" id="countries"></div>` : ""}
  <a class="footer" href="https://rybbit.com" target="_blank" rel="noopener noreferrer">
    Powered by <img src="${logo}" alt="Rybbit web analytics" width="60" height="12" />
  </a>
</div>
<style>
  .w.card {
    background: ${col.bg};
    color: ${col.fg};
    padding: 24px;
    border-radius: 12px;
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 4px;
    font-size: 13px;
    letter-spacing: 0.08em;
    color: ${col.muted};
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0.03em;
  }
  .count {
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    color: ${col.fg};
  }
  .chart {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 90px;
    overflow: hidden;
  }
  .chart .bar {
    flex: 1 1 0;
    min-width: 0;
    background: ${c.accent};
    border-radius: 2px;
  }
  .chart .empty { flex: 1; color: ${col.muted}; font-size: 12px; }
  .window-label { color: ${col.muted}; font-size: 12px; margin-top: 12px; }
  .countries { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
  .countries .row { display: flex; align-items: center; font-size: 14px; }
  .countries .flag { width: 24px; font-size: 18px; line-height: 1; }
  .countries .name { margin-left: 10px; flex: 1; }
  .countries .users { color: ${col.muted}; }
  .footer {
    margin-top: 16px;
    color: ${col.muted};
    font-size: 11px;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 4px;
  }
</style>`;
}

function renderInlineHTML(c: Config) {
  const col = colors(c.theme);
  const logo = c.theme === "dark" ? "/rybbit/frog_white.svg" : "/rybbit/frog_black.svg";
  return `
<div class="w inline">
  <span class="pulse pulse-sm"></span>
  <span class="count" id="count">—</span>
  <span class="muted">online</span>
  <span class="sep">·</span>
  <a href="https://rybbit.com" target="_blank" rel="noopener noreferrer">
    <img src="${logo}" alt="Rybbit web analytics" width="50" height="10" />
  </a>
</div>
<style>
  .w.inline {
    background: ${col.bg};
    color: ${col.fg};
    padding: 6px 12px;
    border-radius: 9999px;
    border: 1px solid ${col.border};
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    line-height: 1;
    box-sizing: border-box;
    width: fit-content;
  }
  .w.inline .count { font-weight: 600; }
  .w.inline .muted { color: ${col.muted}; margin-left: -4px; }
  .w.inline .sep { color: ${col.muted}; opacity: 0.6; }
  .w.inline a { color: ${col.muted}; font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; }
  .w.inline a img { display: block; opacity: 0.7; }
</style>`;
}

function renderHTML(c: Config) {
  const body = c.variant === "inline" ? renderInlineHTML(c) : renderCardHTML(c);
  const config = JSON.stringify({
    siteId: c.siteId,
    minutes: c.minutes,
    chart: c.chart,
    countries: c.countries,
    backendUrl: c.backendUrl,
  });
  const accentColor = c.theme === "dark" ? c.accent : c.accent;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Rybbit live visitors</title>
<style>
  html { color-scheme: ${c.theme}; }
  html, body { background: transparent; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .pulse {
    position: relative;
    display: inline-block;
  }
  .pulse-sm { width: 12px; height: 12px; }
  .pulse-md { width: 14px; height: 14px; }
  .pulse::before, .pulse::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: ${accentColor};
  }
  .pulse::before { opacity: 0.4; animation: rybbit-pulse 1.6s ease-out infinite; }
  .pulse-md::after { inset: 3px; }
  .pulse-sm::after { inset: 2px; }
  @keyframes rybbit-pulse {
    0%   { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.2); opacity: 0; }
  }
</style>
</head>
<body>
${body}
<script>
(function () {
  var cfg = ${config};
  var countEl = document.getElementById("count");
  var chartEl = document.getElementById("chart");
  var countriesEl = document.getElementById("countries");

  var timeFmt = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit", hour12: false });
  var dayFmt = new Intl.DateTimeFormat([], { month: "short", day: "numeric" });
  var nameFmt;
  try { nameFmt = new Intl.DisplayNames([], { type: "region" }); } catch (e) { nameFmt = null; }

  function flagEmoji(cc) {
    if (!cc || cc.length !== 2) return "";
    var s = cc.toUpperCase();
    return String.fromCodePoint(s.charCodeAt(0) + 127397, s.charCodeAt(1) + 127397);
  }

  function countryName(cc) {
    try { return (nameFmt && nameFmt.of(cc)) || cc; } catch (e) { return cc; }
  }

  function formatTime(t, minutes) {
    var d = new Date(t.replace(" ", "T") + "Z");
    if (isNaN(d)) return "";
    return minutes >= 10080 ? dayFmt.format(d) : timeFmt.format(d);
  }

  function renderChart(series) {
    if (!chartEl) return;
    if (!series || !series.length) {
      chartEl.innerHTML = '<div class="empty">No data</div>';
      return;
    }
    var max = 1;
    for (var i = 0; i < series.length; i++) {
      if (series[i].users > max) max = series[i].users;
    }
    var html = "";
    for (var j = 0; j < series.length; j++) {
      var s = series[j];
      var h = Math.max(2, (s.users / max) * 86);
      var label = s.users + " users · " + formatTime(s.time, cfg.minutes);
      html +=
        '<div class="bar" style="height:' + h + 'px" title="' + label.replace(/"/g, "&quot;") + '"></div>';
    }
    chartEl.innerHTML = html;
  }

  function renderCountries(rows) {
    if (!countriesEl) return;
    if (!rows || !rows.length) {
      countriesEl.innerHTML = '<div class="empty" style="color:inherit;font-size:12px">No data</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var safeCC = String(r.country || "").replace(/[^A-Za-z]/g, "").slice(0, 2);
      html +=
        '<div class="row">' +
        '<span class="flag">' + flagEmoji(safeCC) + '</span>' +
        '<span class="name">' + escapeHTML(countryName(safeCC)) + '</span>' +
        '<span class="users">' + r.users + '</span>' +
        '</div>';
    }
    countriesEl.innerHTML = html;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fetchData() {
    var url = cfg.backendUrl + "/sites/" + encodeURIComponent(cfg.siteId) +
      "/embed-stats?minutes=" + cfg.minutes +
      "&chart=" + cfg.chart +
      "&countries=" + cfg.countries;
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        if (countEl) countEl.textContent = (data.count || 0).toLocaleString();
        if (cfg.chart) renderChart(data.series);
        if (cfg.countries) renderCountries(data.topCountries);
      })
      .catch(function () { /* keep last value */ });
  }

  fetchData();
  setInterval(fetchData, 60000);
})();
</script>
</body>
</html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(siteId)) {
    return new Response("Invalid site id", { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const minutesRaw = Number(sp.get("minutes") ?? 30);
  const minutes = ALLOWED_MINUTES.has(minutesRaw) ? minutesRaw : 30;
  const chart = sp.get("chart") === "true";
  const countries = sp.get("countries") === "true";
  const theme: "dark" | "light" = sp.get("theme") === "light" ? "light" : "dark";
  const accentRaw = sp.get("accent");
  const accent = accentRaw && /^[0-9a-fA-F]{6}$/.test(accentRaw) ? `#${accentRaw}` : "#10b981";
  const variant: "card" | "inline" = sp.get("variant") === "inline" ? "inline" : "card";

  const html = renderHTML({
    siteId,
    minutes,
    chart,
    countries,
    theme,
    accent,
    variant,
    backendUrl: getBackendUrl(),
    windowLabel: MINUTES_LABEL[minutes],
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=3600",
      "Content-Security-Policy": "frame-ancestors *",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
