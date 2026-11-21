"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useExtracted } from "next-intl";

interface ErrorAlertProps {
  title?: string;
  message?: string;
  className?: string;
}

export function ErrorAlert({
  title,
  message,
  className = "mb-4",
}: ErrorAlertProps) {
  const t = useExtracted();
  const resolvedTitle = title ?? t("Error");
  const resolvedMessage = message ?? t("An error occurred. Please try again later.");
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{resolvedTitle}</AlertTitle>
      <AlertDescription>{resolvedMessage}</AlertDescription>
    </Alert>
  );
}
