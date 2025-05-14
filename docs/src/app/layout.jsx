/* eslint-env node */
import { Tilt_Warp } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { cn } from "../lib/utils";
import { SmallLogo } from "./components/Logo";
import "./globals.css";

const tilt_wrap = Tilt_Warp({
  subsets: ["latin"],
  weight: "400",
});

export const metadata = {
  metadataBase: new URL("https://rybbit.io"),
  title: {
    template: "%s - Rybbit",
  },
  description:
    "Next-gen, open source, lightweight, cookieless web & product analytics for everyone.",
  // description: 'Next-gen, open source, lightweight, cookieless web & product analytics for everyone — GDPR/CCPA compliant.',
  applicationName: "Rybbit",
  generator: "Next.js",
  appleWebApp: {
    title: "Rybbit",
  },
  other: {
    "msapplication-TileImage": "/ms-icon-144x144.png",
    "msapplication-TileColor": "#fff",
  },
  twitter: {
    site: "https://rybbit.io",
  },
};

function Footer_() {
  return (
    <div className="max-w-[1300px] mx-auto">
      <div className="flex flex-col md:flex-row items-center md:justify-between w-full px-6 py-4 space-y-4 md:space-y-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0 md:justify-between w-full">
          <SmallLogo />
          <div className="text-sm text-neutral-400 text-center md:text-left">
            Copyright {new Date().getFullYear()} © Rybbit.
          </div>
          <div className="flex gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/contact"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function RootLayout({ children }) {
  const navbar = (
    <Navbar
      logo={
        <div
          className={cn(
            "text-2xl flex items-center gap-1.5",
            tilt_wrap.className
          )}
        >
          <Image src="/rybbit.png" alt="Rybbit" width={30} height={30} />
          rybbit.
        </div>
      }
      chatLink="https://discord.gg/DEhGb4hYBj"
      projectLink="https://github.com/rybbit-io/rybbit"
      children={
        <a href="https://app.rybbit.io">
          <button className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium px-3 py-1.5 rounded-md border border-neutral-600 transform hover:-translate-y-0.5 transition-all duration-200 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-opacity-50 cursor-pointer">
            Login
          </button>
        </a>
      }
    />
  );
  const pageMap = await getPageMap();
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head
        color={{
          hue: 158,
          saturation: 64,
          lightness: 51,
        }}
      />
      <script src="https://app.rybbit.io/api/script.js" site-id="2" defer />
      <script
        src="https://demo.rybbit.io/api/script.js"
        data-site-id="21"
        defer
      ></script>
      <body>
        <Layout
          banner={
            <div className="text-center text-sm text-neutral-100 pt-2 pb-1 bg-neutral-700/50 flex items-center justify-center gap-2">
              <div className="mb-1">
                🚀 We just launched! Please star us on Github!{" "}
              </div>
              <a
                className="github-button"
                href="https://github.com/rybbit-io/rybbit"
                data-color-scheme="no-preference: light; light: light; dark: light;"
                data-show-count="true"
                aria-label="Star rybbit-io/rybbit on GitHub"
              ></a>
            </div>
          }
          navbar={navbar}
          footer={<Footer_ />}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/rybbit-io/rybbit/tree/master/docs"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
          nextThemes={{
            defaultTheme: "dark",
            forcedTheme: "dark",
          }}
        >
          {children}
        </Layout>
        <script async defer src="https://buttons.github.io/buttons.js"></script>
      </body>
    </html>
  );
}
