import { CustomHeader } from "@/components/CustomHeader";
import { Footer } from "@/components/Footer";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`${archivo.className} flex min-h-screen flex-col`}>
      <CustomHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
