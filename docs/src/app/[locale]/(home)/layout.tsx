import { CustomHeader } from "@/components/CustomHeader";
import { Footer } from "@/components/Footer";
import localFont from "next/font/local";
import type { ReactNode } from "react";

const martianGrotesk = localFont({
  src: "../../../fonts/martian-grotesk/MartianGrotesk-Variable.woff2",
  display: "swap",
  weight: "100 1000",
  fallback: ["Arial", "sans-serif"],
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`${martianGrotesk.className} flex min-h-screen flex-col`}>
      <CustomHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
