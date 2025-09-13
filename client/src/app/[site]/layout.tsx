"use client";
import { useWindowSize } from "@uidotdev/usehooks";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar } from "../../components/AppSidebar";
import { TopBar } from "../../components/TopBar";
import { useStore } from "../../lib/store";
import { useSyncStateWithUrl } from "../../lib/urlParams";
import { Footer } from "../components/Footer";
import { Header } from "./components/Header/Header";
import { Sidebar } from "./components/Sidebar/Sidebar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setSite, site } = useStore();

  // Sync store state with URL parameters
  useSyncStateWithUrl();

  useEffect(() => {
    if (pathname.includes("/") && pathname.split("/")[1] !== site && !isNaN(Number(pathname.split("/")[1]))) {
      setSite(pathname.split("/")[1]);
    }
  }, [pathname]);

  const { width } = useWindowSize();

  if (width && width < 768) {
    return (
      <div>
        <TopBar />
        <Header />
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-dvh">
      <AppSidebar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-auto">
          <div>
            {/* <div className="px-4 py-2 max-w-[1400px] mx-auto w-full mb-4"> */}
            <Header />
            <div>{children}</div>
            {!pathname.includes("/map") && !pathname.includes("/realtime") && !pathname.includes("/replay") && (
              <Footer />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
