/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    twq?: (action: string, eventId: string, data?: any) => void;
    fbq?: (action: string, eventName: string, data?: any) => void;
    rdt?: (action: string, eventName: string, data?: any) => void;
  }
}

export function trackAdEvent(eventName: "signup" | "checkout" | "login", eventData?: Record<string, any>) {
  // Track X/Twitter lead event for signup-related buttons
  if (typeof window !== "undefined" && window.twq) {
    if (["signup"].some(event => eventName.toLowerCase().includes(event))) {
      window.twq("event", "tw-qj0po-qjdz6", {});
    }
    if (["checkout"].some(event => eventName.toLowerCase().includes(event))) {
      window.twq("event", "tw-qj0po-qjju2", {});
    }
  }

  // Track Facebook lead event
  if (typeof window !== "undefined" && window.fbq) {
    if (["signup"].some(event => eventName.toLowerCase().includes(event))) {
      window.fbq("track", "Lead", eventData);
    }
    if (["checkout"].some(event => eventName.toLowerCase().includes(event))) {
      window.fbq("track", "InitiateCheckout", eventData);
    }
  }

  // Track Reddit events
  if (typeof window !== "undefined" && window.rdt) {
    if (["signup"].some(event => eventName.toLowerCase().includes(event))) {
      window.rdt("track", "SignUp", eventData);
    }
    if (["checkout"].some(event => eventName.toLowerCase().includes(event))) {
      window.rdt("track", "AddToCart", eventData);
    }
  }
}
