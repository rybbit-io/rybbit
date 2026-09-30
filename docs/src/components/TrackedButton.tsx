"use client";

import { AppLink } from "./AppLink";

interface TrackedButtonProps {
  href: string;
  eventName: string;
  eventProps: Record<string, string | number | boolean>;
  className: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}

export function TrackedButton({ href, eventName, eventProps, className, children, target, rel }: TrackedButtonProps) {
  return (
    <AppLink
      href={href}
      className={className}
      data-rybbit-event={eventName}
      {...Object.fromEntries(Object.entries(eventProps).map(([key, value]) => [`data-rybbit-prop-${key}`, value]))}
      target={target}
      rel={rel}
    >
      {children}
    </AppLink>
  );
}
