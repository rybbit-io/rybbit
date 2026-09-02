// Every SVG in /public/logos is pure white: invert to black in light mode, render as-is in dark.
const whiteSvgLogo = "opacity-40 hover:opacity-70 invert dark:opacity-60 dark:hover:opacity-100 dark:invert-0";

export interface CustomerLogo {
  src: string;
  alt: string;
  width: number;
  className: string;
  href?: string;
}

export const customerLogos: CustomerLogo[] = [
  { src: "/logos/bosch.svg", alt: "bosch", width: 120, className: whiteSvgLogo },
  { src: "/logos/texas-instruments.svg", alt: "Texas Instruments", width: 120, className: whiteSvgLogo },
  { src: "/logos/govuk-logo.svg", alt: "GOV.UK", width: 120, className: whiteSvgLogo },
  { src: "/logos/royalcaribbean.svg", alt: "Royal Caribbean", width: 120, className: whiteSvgLogo },
  { src: "/logos/netapp.svg", alt: "NetApp", width: 120, className: whiteSvgLogo },
  { src: "/logos/obelinf.svg", alt: "Obelinf", width: 120, className: whiteSvgLogo, href: "https://obelinf.com" },
  { src: "/logos/op.svg", alt: "OP.GG", width: 120, className: whiteSvgLogo },
  {
    src: "/logos/automatio.webp",
    alt: "Automatio",
    width: 140,
    href: "https://automatio.ai",
    className: "opacity-50 hover:opacity-80 grayscale invert dark:opacity-70 dark:hover:opacity-100 dark:invert-0",
  },
];
