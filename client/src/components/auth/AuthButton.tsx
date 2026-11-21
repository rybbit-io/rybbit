"use client";

import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AuthButtonProps {
  isLoading: boolean;
  /** Screen-reader name while loading; the visible label stays under the spinner. */
  loadingText?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success";
  disabled?: boolean;
}

export function AuthButton({
  isLoading,
  loadingText,
  children,
  className = "",
  onClick,
  type = "submit",
  variant = "success",
  disabled = false,
}: AuthButtonProps) {
  // Callers still pass `disabled={... || isLoading}`; Button lets loading win,
  // so the button keeps focus while the request runs.
  return (
    <Button
      type={type}
      className={`w-full ${className}`}
      loading={isLoading}
      loadingLabel={loadingText}
      disabled={disabled}
      variant={variant}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
