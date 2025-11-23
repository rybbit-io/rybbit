"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export default function StripeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to ensure the page has fully loaded before redirecting
    const redirectTimer = setTimeout(() => {
      // Redirect to the subscription settings page
      router.push("/organization/subscription");
    }, 1000);

    // Clean up the timer if the component unmounts
    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <div className="mb-4">
          <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Your subscription has been processed successfully.
        </p>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2">Redirecting you to your subscription details...</p>
      </div>
    </div>
  );
}
