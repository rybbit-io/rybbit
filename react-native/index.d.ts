export type RybbitStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
};

export type RybbitConfig = {
  analyticsHost: string;
  siteId: string | number;
  appIdentifier?: string;
  bundleId?: string;
  appVersion?: string;
  tag?: string;
  storage?: RybbitStorage;
  storageKeyPrefix?: string;
  debug?: boolean;
  autoTrackAppLifecycle?: boolean;
  initialScreenName?: string;
  configTimeoutMs?: number;
  maxQueueSize?: number;
  fetch?: typeof fetch;
};

export type TrackContext = {
  appIdentifier?: string;
  pathname?: string;
  querystring?: string;
  screen?: string;
  title?: string;
  referrer?: string;
  language?: string;
  userAgent?: string;
};

export type TrackProperties = Record<string, unknown>;

export type NavigationRoute = {
  name?: string;
  path?: string;
  params?: Record<string, unknown>;
};

export type NavigationRef = {
  getCurrentRoute?: () => NavigationRoute | undefined;
};

export type NavigationTrackerOptions = {
  includeRouteParams?: boolean;
  getRouteName?: (route: NavigationRoute | undefined) => string;
  getPath?: (route: NavigationRoute | undefined) => string;
};

export type NavigationTracker = {
  onReady(navigationRef: NavigationRef): Promise<void>;
  onStateChange(navigationRef: NavigationRef): Promise<void>;
  trackCurrentRoute(navigationRef: NavigationRef): Promise<void>;
};

export class RybbitReactNative {
  init(config: RybbitConfig): Promise<void>;
  screen(name: string, properties?: TrackProperties, context?: TrackContext): Promise<void>;
  pageview(path?: string, context?: TrackContext): Promise<void>;
  event(name: string, properties?: TrackProperties, context?: TrackContext): Promise<void>;
  error(error: Error | unknown, properties?: TrackProperties, context?: TrackContext): Promise<void>;
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
  setTraits(traits: Record<string, unknown>): Promise<void>;
  clearUserId(): Promise<void>;
  getUserId(): string | null;
  flush(): Promise<void>;
  createNavigationTracker(options?: NavigationTrackerOptions): NavigationTracker;
  cleanup(): void;
}

declare const rybbit: RybbitReactNative;
export default rybbit;
