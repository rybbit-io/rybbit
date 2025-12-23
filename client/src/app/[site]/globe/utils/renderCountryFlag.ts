import { createElement } from "react";
import * as CountryFlags from "country-flag-icons/react/3x2";
// @ts-ignore - React 19 has built-in types
import { renderToStaticMarkup } from "react-dom/server";

// Render country flag to static SVG
export function renderCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const FlagComponent = CountryFlags[countryCode.toUpperCase() as keyof typeof CountryFlags];
  if (!FlagComponent) return "";
  const flagElement = createElement(FlagComponent, { className: "w-5 h-3 inline-block" });
  return renderToStaticMarkup(flagElement);
}
