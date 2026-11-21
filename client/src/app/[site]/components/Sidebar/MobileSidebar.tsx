"use client";

import { useExtracted } from "next-intl";
import { usePathname } from "next/navigation";
import { useGetSite } from "../../../../api/admin/hooks/useSites";
import { Sidebar } from "./Sidebar";
import { Button } from "../../../../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../../../components/ui/sheet";

import { Menu } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Favicon } from "../../../../components/Favicon";
import { AppSidebar } from "../../../../components/AppSidebar";
import { useEmbedablePage } from "../../utils";
import { Suspense } from "react";

function MobileSidebarContent() {
  const t = useExtracted();
  const pathname = usePathname();
  const { data: site } = useGetSite(Number(pathname.split("/")[1]));

  const embed = useEmbedablePage();
  if (embed) return null;

  return (
    <div className="md:hidden flex items-center gap-2">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline">
            <Menu />
          </Button>
        </SheetTrigger>
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>{t("Rybbit Sidebar")}</SheetTitle>
          </SheetHeader>
        </VisuallyHidden>
        <SheetContent side="left" className="p-0 w-[240px] flex gap-0" showClose={false}>
          <AppSidebar />
          <Sidebar />
        </SheetContent>
      </Sheet>
      {site && <Favicon domain={site.domain} className="w-6 h-6" />}
    </div>
  );
}

export function MobileSidebar() {
  return (
    <Suspense fallback={null}>
      <MobileSidebarContent />
    </Suspense>
  );
}
