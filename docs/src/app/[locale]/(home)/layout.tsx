import { CustomHeader } from "@/components/CustomHeader";
import { Footer } from "@/components/Footer";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomHeader />
      <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
      <Footer />
    </>
  );
}
