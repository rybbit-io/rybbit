import "@/app/global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Inter } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Rybbit - Privacy-First Web Analytics Platform",
    template: "%s | Rybbit",
  },
  description:
    "Open-source, privacy-focused web analytics platform. Track your website performance without compromising user privacy. Self-hostable alternative to Google Analytics.",
  keywords: [
    "web analytics",
    "privacy analytics",
    "open source analytics",
    "Google Analytics alternative",
    "website tracking",
    "self-hosted analytics",
  ],
  authors: [{ name: "Rybbit Team" }],
  creator: "Rybbit",
  publisher: "Rybbit",
  metadataBase: new URL("https://rybbit.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rybbit.com",
    siteName: "Rybbit",
    title: "Rybbit - Privacy-First Web Analytics Platform",
    description:
      "Open-source, privacy-focused web analytics platform. Track your website performance without compromising user privacy.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Rybbit Analytics Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rybbit - Privacy-First Web Analytics Platform",
    description:
      "Open-source, privacy-focused web analytics platform. Track your website performance without compromising user privacy.",
    images: ["/opengraph-image.png"],
    creator: "@yang_frog",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "",
    yandex: "",
    yahoo: "",
  },
};

const isDev = process.env.NODE_ENV === "development";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script
        src="https://demo.rybbit.com/api/script.js"
        data-site-id="21"
        strategy="afterInteractive"
        data-session-replay="true"
        data-web-vitals="true"
        data-track-errors="true"
        data-track-outbound="true"
        {...(isDev && {
          "data-api-key": process.env.NEXT_PUBLIC_RYBBIT_API_KEY,
        })}
      />
      <body className={`flex flex-col min-h-screen ${inter.variable} font-sans`}>
        <RootProvider
          theme={{
            enabled: true,
            enableSystem: true,
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
