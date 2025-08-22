import type { ReactNode } from "react";
import { CustomHeader } from "@/components/CustomHeader";
import { Footer } from "@/components/Footer";

const isDev = process.env.NODE_ENV === "development";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        src="https://demo.rybbit.io/api/script.js"
        data-site-id="21"
        defer
        data-session-replay="true"
        data-web-vitals="true"
        data-track-errors="true"
        data-track-outbound="true"
        {...(isDev && {
          "data-api-key": process.env.NEXT_PUBLIC_RYBBIT_API_KEY,
        })}
      ></script>
      <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
      <CustomHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
