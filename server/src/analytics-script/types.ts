export interface ScriptConfig {
  analyticsHost: string;
  siteId: string;
  debounceDuration: number;
  autoTrackPageview: boolean;
  autoTrackSpa: boolean;
  trackQuerystring: boolean;
  trackOutbound: boolean;
  enableWebVitals: boolean;
  trackErrors: boolean;
  enableSessionReplay: boolean;
  sessionReplayBatchSize: number;
  sessionReplayBatchInterval: number;
  sessionReplayMaskTextSelectors: string[];
  skipPatterns: string[];
  maskPatterns: string[];
}

export interface BasePayload {
  site_id: string;
  hostname: string;
  pathname: string;
  querystring: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  page_title: string;
  referrer: string;
  user_id?: string;
}

export interface TrackingPayload extends BasePayload {
  type: "pageview" | "custom_event" | "outbound" | "performance" | "error";
  event_name?: string;
  properties?: string;
  // Web vitals metrics
  lcp?: number | null;
  cls?: number | null;
  inp?: number | null;
  fcp?: number | null;
  ttfb?: number | null;
}

export interface WebVitalsData {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
}

export interface ErrorProperties {
  filename?: string;
  lineno?: number | string;
  colno?: number | string;
  [key: string]: any;
}

export interface RybbitAPI {
  pageview: () => void;
  event: (name: string, properties?: Record<string, any>) => void;
  error: (error: Error, properties?: ErrorProperties) => void;
  trackOutbound: (url: string, text?: string, target?: string) => void;
  identify: (userId: string) => void;
  clearUserId: () => void;
  getUserId: () => string | null;
  startSessionReplay: () => void;
  stopSessionReplay: () => void;
  isSessionReplayActive: () => boolean;
}

export interface SessionReplayEvent {
  type: string | number;
  data: any;
  timestamp: number;
}

export interface SessionReplayBatch {
  userId: string;
  events: SessionReplayEvent[];
  metadata?: {
    pageUrl: string;
    viewportWidth?: number;
    viewportHeight?: number;
    language?: string;
  };
}
