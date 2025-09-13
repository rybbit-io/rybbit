import React from "react";
import { cn } from "@/lib/utils";

interface StatusOrbProps {
  status: "up" | "down" | "unknown";
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function StatusOrb({ status, className, size = "md", animated = true }: StatusOrbProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const statusClasses = {
    up: "bg-green-400",
    down: "bg-red-500",
    unknown: "bg-gray-400 dark:bg-gray-600",
  };

  const pulseClasses = {
    up: "animate-pulse",
    down: "animate-pulse",
    unknown: "",
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <div
        className={cn(
          "rounded-full",
          sizeClasses[size],
          statusClasses[status],
          animated && status !== "unknown" && pulseClasses[status]
        )}
      />
      {animated && status !== "unknown" && (
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-75",
            sizeClasses[size],
            statusClasses[status],
            "animate-ping"
          )}
        />
      )}
    </div>
  );
}
