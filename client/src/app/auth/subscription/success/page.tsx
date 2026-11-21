"use client";

import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Legacy Stripe success URL: checkouts now return to /{siteId} or /settings/billing. Anyone who still
// lands here goes to billing, keeping session_id so that page can record the conversion.
export default function StripeSuccessPage() {
  const t = useExtracted();
  const router = useRouter();

  useEffect(() => {
    // Leave the confirmation on screen for a moment before redirecting
    const redirectTimer = setTimeout(() => {
      const sessionId = new URLSearchParams(window.location.search).get("session_id");
      router.replace(sessionId ? `/settings/billing?session_id=${encodeURIComponent(sessionId)}` : "/settings/billing");
    }, 1000);

    // Clean up the timer if the component unmounts
    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">{t("Payment Successful!")}</h1>
        <div className="mb-4">
          <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {t("Your subscription has been processed successfully.")}
        </p>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2">
          {t("Redirecting you to your subscription details…")}
        </p>
      </div>
    </div>
  );
}
