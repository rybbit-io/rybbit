import { DateTime } from "luxon";
import { createElement } from "react";
import { getTimezone } from "../../../../lib/store";
// @ts-ignore - React 19 has built-in types
import { renderToStaticMarkup } from "react-dom/server";
import { Eye, MousePointerClick } from "lucide-react";
import { generateName } from "../../../../components/Avatar";
import { formatShortDuration, hour12, userLocale } from "../../../../lib/dateTimeUtils";
import type { GetSessionsResponse } from "../../../../api/analytics/endpoints";
import { extractDomain, getDisplayName } from "../../../../components/Channel";
import {
  generateAvatarSVG,
  renderCountryFlag,
  renderDeviceIcon,
  renderChannelIcon,
  getBrowserIconPath,
  getOSIconPath,
} from "../3d/hooks/timelineLayer/timelineMarkerHelpers";

/**
 * Build the HTML content for a session tooltip
 */
export function buildTooltipHTML(session: GetSessionsResponse[number], lng: number, lat: number): string {
  const avatarSVG = generateAvatarSVG(session.user_id, 36);
  const countryCode = session.country?.length === 2 ? session.country : "";
  const flagSVG = renderCountryFlag(countryCode);
  const deviceIconSVG = renderDeviceIcon(session.device_type || "");
  const browserIconPath = getBrowserIconPath(session.browser || "");
  const osIconPath = getOSIconPath(session.operating_system || "");

  // Duration formatting
  const durationDisplay = formatShortDuration(session.session_duration || 0);

  // Start time formatting
  const startTime = DateTime.fromSQL(session.session_start, { zone: "utc" })
    .setLocale(userLocale)
    .setZone(getTimezone())
    .toFormat(hour12 ? "MMM d, h:mm a" : "dd MMM, HH:mm");

  // Pageview and event icons
  const pageviewIconSVG = renderToStaticMarkup(
    createElement(Eye, { size: 14, className: "inline-block text-blue-400" })
  );
  const eventIconSVG = renderToStaticMarkup(
    createElement(MousePointerClick, { size: 14, className: "inline-block text-amber-400" })
  );

  // Referrer/Channel display
  const domain = extractDomain(session.referrer);
  let referrerIconSVG = "";
  let referrerText = "";

  if (domain) {
    referrerText = getDisplayName(domain);
    referrerIconSVG = renderChannelIcon(session.channel);
  } else {
    referrerText = session.channel;
    referrerIconSVG = renderChannelIcon(session.channel);
  }

  const name = generateName(session.user_id);

  return `
    <div class="flex flex-col gap-3 p-3 bg-neutral-850 border border-neutral-750 rounded-lg">
      <div class="flex items-start gap-2.5">
        <div class="shrink-0 w-9 h-9 rounded-full overflow-hidden">
          ${avatarSVG}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-white truncate">${name}</h3>
          <div class="flex items-center gap-1 text-xs text-neutral-300 mt-0.5">
            ${flagSVG}
            <span>${session.city || "Unknown"}, ${session.country || "Unknown"}</span>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
        ${browserIconPath ? `<img src="${browserIconPath}" alt="${session.browser}" title="${session.browser}" class="w-4 h-4" />` : ""}
        ${osIconPath ? `<img src="${osIconPath}" alt="${session.operating_system}" title="${session.operating_system}" class="w-4 h-4" />` : ""}
        <span class="flex items-center" title="${session.device_type}">${deviceIconSVG}</span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-xs">
          ${pageviewIconSVG}
          <span>${session.pageviews || 0}</span>
        </span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-xs">
          ${eventIconSVG}
          <span>${session.events || 0}</span>
        </span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-xs">
          ${referrerIconSVG}
          <span>${referrerText}</span>
        </span>
      </div>
      <div class="flex items-center justify-between gap-2 text-xs text-neutral-400 pt-1.5 border-t border-neutral-700">
        <span>${startTime}</span>
        <span class="text-neutral-200">${durationDisplay}</span>
      </div>
      <button
        class="view-session-btn w-full px-2 py-1 bg-accent-600 hover:bg-accent-700 text-white text-xs font-medium rounded transition-colors"
        data-session-id="${session.session_id}"
        tabindex="-1"
      >
        View Details
      </button>
    </div>
  `;
}
