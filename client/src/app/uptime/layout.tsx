"use client";

import { useWindowSize } from "@uidotdev/usehooks";
import { AppSidebar } from "../../components/AppSidebar";
import { MobileSidebar } from "./monitors/components/Sidebar/MobileSidebar";
import { StandardPage } from "../../components/StandardPage";
import { UptimeSidebar } from "./monitors/components/Sidebar/UptimeSidebar";

export default function UptimeLayout({ children }: { children: React.ReactNode }) {
  const { width } = useWindowSize();

  if (width && width < 768) {
    return (
      <StandardPage showSidebar={false}>
        <MobileSidebar />
        <div className="mt-4">{children}</div>
      </StandardPage>
    );
  }

  return (
    <div className="flex h-full">
      <AppSidebar />
      <UptimeSidebar />
      <StandardPage showSidebar={false}>
        <div className="flex-1 overflow-auto mt-4">{children}</div>
      </StandardPage>
    </div>
  );
}
