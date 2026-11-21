"use client";

import { appendReferral } from "@/lib/rewardful";

type AppLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function AppLink({ href, onClick, target, children, ...rest }: AppLinkProps) {
  return (
    <a
      href={href}
      target={target}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !href) return;
        const decorated = appendReferral(href);
        if (decorated !== href) {
          e.preventDefault();
          if (target === "_blank") {
            window.open(decorated, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = decorated;
          }
        }
      }}
    >
      {children}
    </a>
  );
}
