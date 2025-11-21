"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .newsletter-popup {
    animation: fadeIn 1s ease-in-out;
  }
`;

export function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has already subscribed (via cookie)
    const subscribed = document.cookie
      .split("; ")
      .find((row) => row.startsWith("rybbit_subscribed="));

    if (!subscribed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Replace with your actual newsletter API endpoint
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set cookie to prevent showing popup again (1 year expiration)
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        document.cookie = `rybbit_subscribed=true; expires=${expirationDate.toUTCString()}; path=/`;

        setIsSubmitted(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else if (response.status === 409) {
        // Email already registered - set cookie anyway
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        document.cookie = `rybbit_subscribed=true; expires=${expirationDate.toUTCString()}; path=/`;

        setErrorMessage("Email already registered");
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setErrorMessage(data.error || "Failed to subscribe. Please try again.");
      }
    } catch (error) {
      console.error("Error subscribing to newsletter:", error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm newsletter-popup">
        <div className="relative rounded-lg bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            aria-label="Close newsletter popup"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-8">
            {!isSubmitted ? (
              <>
                <h2 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">
                  Stay Updated
                </h2>
                <p className="mb-6 text-neutral-600 dark:text-neutral-400">
                  Subscribe to the Rybbit Newsletter and never miss important updates from our team.
                </p>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Product Updates</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Blog Posts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">New Features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">Exclusive Discounts</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  
                  {errorMessage && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {errorMessage}
                      </p>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? "Subscribing..." : "Subscribe"}
                  </button>
                </form>

                <button
                  onClick={handleClose}
                  className="mt-3 w-full text-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Maybe later
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="mb-4 flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                  Success!
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Thanks for subscribing to our newsletter. Check your inbox for the latest updates from Rybbit!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
