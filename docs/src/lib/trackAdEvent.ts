/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    twq?: (action: string, eventId: string, data?: any) => void;
    fbq?: (action: string, eventName: string, data?: any) => void;
    rdt?: (action: string, eventName: string, data?: any) => void;
  }
}

export function trackAdEvent(eventName: "signup" | "demo" | "login" | "github", eventData?: Record<string, any>) {
  // Track X/Twitter lead event for signup-related buttons
  if (typeof window !== "undefined" && window.twq) {
    if (["signup"].some(event => eventName.toLowerCase().includes(event))) {
      window.twq("event", "tw-qj0po-qjdz6", {});
    }
    if (["demo"].some(event => eventName.toLowerCase().includes(event))) {
      window.twq("event", "tw-qj0po-qje0f", {});
    }
    if (["login"].some(event => eventName.toLowerCase().includes(event))) {
      window.twq("event", "tw-qj0po-qjjy6", {});
    }
  }

  // Track Facebook lead event
  if (typeof window !== "undefined" && window.fbq) {
    if (["signup"].some(event => eventName.toLowerCase().includes(event))) {
      window.fbq("track", "Lead", eventData);
    }
    // if (["demo"].some(event => eventName.toLowerCase().includes(event))) {
    //   window.fbq("track", "ViewContent", eventData);
    // }
    // Track custom events for other button clicks
    if (!["demo"].some(event => eventName.toLowerCase().includes(event))) {
      window.fbq("trackCustom", eventName, eventData);
    }
    if (["github"].some(event => eventName.toLowerCase().includes(event))) {
      window.fbq("trackCustom", "GitHub", eventData);
    }
  }

  // Track Reddit events
  if (typeof window !== "undefined" && window.rdt) {
    if (["signup"].some(event => eventName.toLowerCase().includes(event))) {
      window.rdt("track", "SignUp", eventData);
    }
    if (["demo"].some(event => eventName.toLowerCase().includes(event))) {
      window.rdt("track", "ViewContent", eventData);
    }
    if (["login"].some(event => eventName.toLowerCase().includes(event))) {
      window.rdt("track", "Custom", { ...eventData, customEventName: "Login" });
    }
    if (["github"].some(event => eventName.toLowerCase().includes(event))) {
      window.rdt("track", "Custom", { ...eventData, customEventName: "GitHub" });
    }
  }
}
