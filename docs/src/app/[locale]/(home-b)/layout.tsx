import { CustomHeader } from "@/components/CustomHeader";
import { Footer } from "@/components/Footer";
import type { ReactNode } from "react";

/**
 * Layout for the homepage redesign (variant B). Identical to `(home)`'s, but
 * the wrapper pins the redesign's "bare" register (see global.css) so the
 * page reads the same whether or not the visitor carries the experiment
 * cookie — e.g. when reviewing /lp/b directly.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div data-chrome="bare" className="contents">
      <CustomHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
