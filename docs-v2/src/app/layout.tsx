import "@/app/global.css";
import { RootProvider } from "fumadocs-ui/provider";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`flex flex-col min-h-screen ${inter.variable} font-sans`}>
        <RootProvider 
          theme={{
            forcedTheme: "dark",
            defaultTheme: "dark",
            enabled: false
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
