import { AnchorHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function ExternalLink({
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-blue-500 hover:underline underline-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}
