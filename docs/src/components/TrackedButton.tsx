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
      className="w-full sm:w-auto"
      data-rybbit-event={eventName}
      data-rybbit-prop-location={eventProps.location}
      target={target}
      rel={rel}
    >
      <button className={className}>{children}</button>
    </AppLink>
  );
}
