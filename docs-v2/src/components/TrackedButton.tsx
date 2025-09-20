/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ReactNode } from "react";

interface TrackedButtonProps {
  children: ReactNode;
  eventName: string;
  eventData?: Record<string, any>;
  className?: string;
  onClick?: () => void;
}

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

export function TrackedButton({ children, eventName, eventData = {}, className, onClick }: TrackedButtonProps) {
  const handleClick = () => {
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        ...eventData,
      });
    }

    if (onClick) {
      onClick();
    }
  };

  return (
    <button className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
