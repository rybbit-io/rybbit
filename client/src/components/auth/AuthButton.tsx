"use client";

import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AuthButtonProps {
  isLoading: boolean;
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
  loadingText = "Loading...",
  children,
  className = "",
  onClick,
  type = "submit",
  variant = "success",
  disabled = false,
}: AuthButtonProps) {
  return (
    <Button type={type} className={`w-full ${className}`} disabled={disabled || isLoading} variant={variant} onClick={onClick}>
      {isLoading ? loadingText : children}
    </Button>
  );
}
