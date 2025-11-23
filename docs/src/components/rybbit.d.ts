interface Rybbit {
  /**
   * Tracks a page view
   */
  pageview: () => void;
  /**
   * Tracks a custom event
   * @param name Name of the event
   * @param properties Optional properties for the event
   */
  event: (name: string, properties?: Record<string, any>) => void;
  /**
   * Sets a custom user ID for tracking logged-in users
   * @param userId The user ID to set (will be stored in localStorage)
   */
  identify: (userId: string) => void;
  /**
   * Clears the stored user ID
   */
  clearUserId: () => void;
  /**
   * Gets the currently set user ID
   * @returns The current user ID or null if not set
   */
  getUserId: () => string | null;
  /**
   * Manually tracks outbound link clicks
   * @param url The URL of the outbound link
   * @param text Optional text content of the link
   * @param target Optional target attribute of the link
   */
  trackOutbound: (url: string, text?: string, target?: string) => void;
}
declare global {
  interface Window {
    rybbit: Rybbit;
  }
}
export {};
