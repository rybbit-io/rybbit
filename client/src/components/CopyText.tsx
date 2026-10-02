"use client";

import { useExtracted } from "next-intl";
import { ReactNode } from "react";

import { CopyButton } from "@/components/interior/copy-button";
import { cn } from "@/lib/utils";

interface CopyTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  copyButtonClassName?: string;
  showCopyButton?: boolean;
  tooltipText?: string;
  children?: ReactNode;
}

/**
 * A component to display text that can be easily copied to clipboard
 * with optional truncation functionality
 */
export function CopyText({
  text,
  maxLength,
  className,
  copyButtonClassName,
  showCopyButton = true,
  tooltipText,
  children,
}: CopyTextProps) {
  const t = useExtracted();
  const displayText = maxLength && text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  return (
    <div className={cn("flex items-center gap-1.5 group", className)}>
      <span className="font-mono text-sm truncate">{children || displayText}</span>

      {showCopyButton && (
        <CopyButton
          iconOnly
          size="xs"
          tooltip
          value={text}
          label={tooltipText ?? t("Copy to clipboard")}
          className={cn("size-5.5 [&_svg]:size-3.5", copyButtonClassName)}
        />
      )}
    </div>
  );
}
