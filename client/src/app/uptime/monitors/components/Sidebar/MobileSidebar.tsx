"use client";

import { UptimeSidebar } from "./UptimeSidebar";

import { Menu } from "lucide-react";
import { VisuallyHidden } from "radix-ui";
import { AppSidebar } from "../../../../../components/AppSidebar";
import { Button } from "../../../../../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../../../../components/ui/sheet";

export function MobileSidebar() {
  return (
    <div className="md:hidden flex items-center gap-2">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline">
            <Menu />
          </Button>
        </SheetTrigger>
        <VisuallyHidden.Root>
          <SheetHeader>
            <SheetTitle>Rybbit Sidebar</SheetTitle>
          </SheetHeader>
        </VisuallyHidden.Root>
        <SheetContent side="left" className="p-0 w-[240px] flex gap-0" showClose={false}>
          <AppSidebar />
          <UptimeSidebar />
        </SheetContent>
      </Sheet>
    </div>
  );
}
