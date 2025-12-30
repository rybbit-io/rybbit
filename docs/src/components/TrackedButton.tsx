"use client";

import { trackAdEvent } from "@/lib/trackAdEvent";
import Link from "next/link";

interface TrackedButtonProps {
  href: string;
  eventName: "signup" | "demo" | "login" | "github";
  eventProps: Record<string, string | number | boolean>;
  className: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}

export function TrackedButton({ href, eventName, eventProps, className, children, target, rel }: TrackedButtonProps) {
  return (
    <Link
      href={href}
      className="w-full sm:w-auto"
      data-rybbit-event={eventName}
      data-rybbit-prop-location={eventProps.location}
      target={target}
      rel={rel}
    >
      <button onClick={() => trackAdEvent(eventName, eventProps)} className={className}>
        {children}
      </button>
    </Link>
  );
}
