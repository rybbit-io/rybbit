"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ReplayPlayer } from "@/components/replay/player/ReplayPlayer";
import { useReplayStore } from "@/components/replay/replayStore";
import { ReplayBreadcrumbs } from "@/components/replay/ReplayBreadcrumbs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ReplayDrawerProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReplayDrawer({ sessionId, open, onOpenChange }: ReplayDrawerProps) {
  const { setSessionId, resetPlayerState } = useReplayStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Set sessionId in store when drawer opens
  useEffect(() => {
    if (open && sessionId) {
      setSessionId(sessionId);
    }
  }, [open, sessionId, setSessionId]);

  // Reset player state when drawer closes
  useEffect(() => {
    if (!open) {
      resetPlayerState();
    }
  }, [open, resetPlayerState]);

  // Measure container dimensions using getBoundingClientRect for more reliable sizing
  useEffect(() => {
    if (!open) return;

    const measureDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({ width: rect.width, height: rect.height });
        }
      }
    };

    // Measure after a short delay to ensure drawer animation has completed
    const timeoutId = setTimeout(measureDimensions, 100);

    // Also set up resize observer for window resizes
    const resizeObserver = new ResizeObserver(() => {
      measureDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", measureDimensions);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureDimensions);
    };
  }, [open]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[90vh]">
        <VisuallyHidden>
          <DrawerTitle>Session Replay</DrawerTitle>
        </VisuallyHidden>
        <div className="flex gap-2 p-2 h-[97%]">
          {/* Player */}
          <div ref={containerRef} className="relative flex-1" style={{ height: "calc(90vh - 40px)" }}>
            {dimensions.width > 0 && dimensions.height > 0 && (
              <ReplayPlayer width={dimensions.width} height={dimensions.height} isDrawer={true} />
            )}
          </div>

          {/* Timeline sidebar */}
          <div className="w-[300px] hidden lg:block h-[calc(90vh - 40px)]">
            <ReplayBreadcrumbs />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
