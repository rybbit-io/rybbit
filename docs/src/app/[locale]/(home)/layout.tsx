import { CustomHeader } from "@/components/CustomHeader";
import { Footer } from "@/components/Footer";
import { Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`${sourceSans.className} flex min-h-screen flex-col`}>
      <CustomHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
