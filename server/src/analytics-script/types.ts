export interface ScriptConfig {
  namespace: string;
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
  // Session replay rrweb options
  sessionReplayBlockClass?: string;
  sessionReplayBlockSelector?: string;
  sessionReplayIgnoreClass?: string;
  sessionReplayIgnoreSelector?: string;
  sessionReplayMaskTextClass?: string;
  sessionReplayMaskAllInputs?: boolean;
  sessionReplayMaskInputOptions?: Record<string, boolean>;
  sessionReplayCollectFonts?: boolean;
  sessionReplaySampling?: Record<string, any>;
  sessionReplaySlimDOMOptions?: Record<string, boolean> | boolean;
  sessionReplaySampleRate?: number; // 0-100, percentage of sessions to record
  trackButtonClicks: boolean;
  trackCopy: boolean;
  trackFormInteractions: boolean;
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
  type: "pageview" | "custom_event" | "outbound" | "performance" | "error" | "button_click" | "copy" | "form_submit" | "input_change";
  event_name?: string;
  properties?: string;
  // Web vitals metrics
  lcp?: number | null;
  cls?: number | null;
  inp?: number | null;
  fcp?: number | null;
  ttfb?: number | null;
}

export interface ButtonClickProperties {
  text?: string;
  [key: string]: string | undefined; // Additional data-rybbit-* attributes
}

export interface CopyProperties {
  text: string;
  textLength?: number; // Only sent if text was truncated
  sourceElement: string;
}

export interface FormSubmitProperties {
  formId: string;
  formName: string;
  formAction: string;
  method: string;
  fieldCount: number;
  ariaLabel?: string;
  [key: string]: string | number | undefined;
}

export interface InputChangeProperties {
  element: string; // "input" | "select" | "textarea"
  inputType?: string; // For inputs: "text", "email", "checkbox", etc.
  inputName: string; // Name, id, aria-label, or placeholder attribute
  formId?: string; // Parent form id if within a form
  formName?: string; // Parent form name if within a form
  [key: string]: string | undefined;
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
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  setTraits: (traits: Record<string, unknown>) => void;
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
