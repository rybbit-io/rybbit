import { CustomHeader } from "@/components/CustomHeader";
import { Footer } from "@/components/Footer";
import type { ReactNode } from "react";

/**
 * Layout for the homepage redesign (variant B): the same header and footer as
 * the marketing pages, in the redesign's bare register (no instrument sheet,
 * pill buttons). Sibling of `(home)/layout.tsx`.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomHeader chrome="bare" />
      <main className="flex-1">{children}</main>
      <Footer chrome="bare" />
    </>
  );
}
