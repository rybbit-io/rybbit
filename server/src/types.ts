// Re-export AppRouter type from router
export type { AppRouter } from "./router.js";

export interface TrackingPayload {
  site_id: string;
  hostname: string;
  pathname: string;
  querystring: string;
  timestamp: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  page_title: string;
  referrer: string;
}
