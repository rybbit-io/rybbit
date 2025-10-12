"use client";

import QueryProvider from "@/providers/QueryProvider";
import { Inter } from "next/font/google";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { cn } from "../lib/utils";
import "./globals.css";
import Script from "next/script";
import { useStopImpersonation } from "@/hooks/useStopImpersonation";
import { useIsProduction } from "@/hooks/useIsProduction";
import { ReactScan } from "./ReactScan";
import { OrganizationInitializer } from "../components/OrganizationInitializer";
import { AuthenticationGuard } from "../components/AuthenticationGuard";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Use the hook to expose stopImpersonating globally
  useStopImpersonation();

  const { isProduction, isAppProduction } = useIsProduction();

  return (
    <html lang="en" className="dark">
      {isProduction && (
        <head>
          <Script id="gtm-script" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KWZ8K6K9');`}
          </Script>
          <Script
            id="reddit-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);rdt('init','a2_hpzt3lz1c1f0');rdt('track', 'PageVisit');`,
            }}
          />
          <Script
            id="twitter-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','qj0po');`,
            }}
          />
          <Script
            id="facebook-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '816836311029789');
fbq('track', 'PageView');`,
            }}
          />
        </head>
      )}
      <ReactScan />
      <TooltipProvider>
        <body className={cn("bg-background text-foreground h-full", inter.className)} suppressHydrationWarning>
          {isProduction && (
            <noscript>
              <iframe
                src="https://www.googletagmanager.com/ns.html?id=GTM-KWZ8K6K9"
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          )}
          <QueryProvider>
            <OrganizationInitializer />
            <AuthenticationGuard />
            {children}
          </QueryProvider>
          <Toaster />
        </body>
      </TooltipProvider>
      {isAppProduction && (
        <>
          <Script
            src="https://demo.rybbit.io/api/script.js"
            data-site-id="22"
            strategy="afterInteractive"
            data-web-vitals="true"
            data-track-errors="true"
            data-session-replay="true"
          />
        </>
      )}
    </html>
  );
}
