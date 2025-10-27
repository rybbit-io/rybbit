"use client";

import { Turnstile as CloudflareTurnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef } from "react";

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

export function Turnstile({ onSuccess, onError, onExpire, className = "" }: TurnstileProps) {
  const turnstileRef = useRef<TurnstileInstance>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is not defined");
    return null;
  }

  return (
    <div className={className}>
      <CloudflareTurnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onSuccess}
        onError={() => {
          console.error("Turnstile error");
          onError?.();
        }}
        onExpire={() => {
          console.warn("Turnstile token expired");
          onExpire?.();
        }}
        options={{
          theme: "dark",
          size: "normal",
        }}
      />
    </div>
  );
}
