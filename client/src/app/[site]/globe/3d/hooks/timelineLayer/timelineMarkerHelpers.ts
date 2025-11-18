import BoringAvatar from "boring-avatars";
import { createElement } from "react";
// @ts-ignore - React 19 has built-in types
import { renderToStaticMarkup } from "react-dom/server";
import * as CountryFlags from "country-flag-icons/react/3x2";
import {
  Monitor,
  Smartphone,
  Link,
  Search,
  ExternalLink,
  Users,
  Mail,
  HelpCircle,
  DollarSign,
  Video,
  Handshake,
  FileText,
  ShoppingCart,
  Calendar,
  Headphones,
} from "lucide-react";
import { AVATAR_COLORS } from "../../../../../../components/Avatar";

// Generate avatar SVG using boring-avatars
export function generateAvatarSVG(userId: string, size: number): string {
  const avatarElement = createElement(BoringAvatar, {
    size,
    name: userId,
    variant: "beam",
    colors: AVATAR_COLORS,
  });
  return renderToStaticMarkup(avatarElement);
}

// Render country flag to static SVG
export function renderCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const FlagComponent = CountryFlags[countryCode.toUpperCase() as keyof typeof CountryFlags];
  if (!FlagComponent) return "";
  const flagElement = createElement(FlagComponent, { className: "w-4 h-3 inline-block" });
  return renderToStaticMarkup(flagElement);
}

// Render device icon based on device type
export function renderDeviceIcon(deviceType: string): string {
  const type = deviceType?.toLowerCase() || "";
  const Icon = type.includes("mobile") || type.includes("tablet") ? Smartphone : Monitor;
  const iconElement = createElement(Icon, { size: 14, className: "inline-block" });
  return renderToStaticMarkup(iconElement);
}

// Get channel icon component
function getChannelIconComponent(channel: string) {
  switch (channel) {
    case "Direct":
      return Link;
    case "Organic Search":
      return Search;
    case "Referral":
      return ExternalLink;
    case "Organic Social":
      return Users;
    case "Email":
      return Mail;
    case "Unknown":
      return HelpCircle;
    case "Paid Search":
      return Search;
    case "Paid Unknown":
      return DollarSign;
    case "Paid Social":
      return Users;
    case "Display":
      return Monitor;
    case "Organic Video":
      return Video;
    case "Affiliate":
      return Handshake;
    case "Content":
      return FileText;
    case "Organic Shopping":
      return ShoppingCart;
    case "Event":
      return Calendar;
    case "Audio":
      return Headphones;
    default:
      return null;
  }
}

// Render channel icon
export function renderChannelIcon(channel: string): string {
  const IconComponent = getChannelIconComponent(channel);
  if (!IconComponent) return "";
  const iconElement = createElement(IconComponent, { size: 14, className: "inline-block" });
  return renderToStaticMarkup(iconElement);
}

// Get browser icon path
export function getBrowserIconPath(browser: string): string {
  const BROWSER_TO_LOGO: Record<string, string> = {
    Chrome: "Chrome.svg",
    "Mobile Chrome": "Chrome.svg",
    Firefox: "Firefox.svg",
    "Mobile Firefox": "Firefox.svg",
    Safari: "Safari.svg",
    "Mobile Safari": "Safari.svg",
    Edge: "Edge.svg",
    Opera: "Opera.svg",
    Brave: "Brave.svg",
  };
  return BROWSER_TO_LOGO[browser] ? `/browsers/${BROWSER_TO_LOGO[browser]}` : "";
}

// Get OS icon path
export function getOSIconPath(os: string): string {
  const OS_TO_LOGO: Record<string, string> = {
    Windows: "Windows.svg",
    Android: "Android.svg",
    android: "Android.svg",
    Linux: "Tux.svg",
    macOS: "macOS.svg",
    iOS: "Apple.svg",
    "Chrome OS": "Chrome.svg",
  };
  return OS_TO_LOGO[os] ? `/operating-systems/${OS_TO_LOGO[os]}` : "";
}
