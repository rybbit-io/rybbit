"use strict";

const SDK_VERSION = "0.1.0";
const DEFAULT_CONFIG_TIMEOUT_MS = 3000;
const DEFAULT_MAX_QUEUE_SIZE = 100;

let ReactNativeModule;

function getReactNative() {
  if (!ReactNativeModule) {
    ReactNativeModule = require("react-native");
  }
  return ReactNativeModule;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function createMemoryStorage() {
  const values = new Map();
  return {
    async getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

function generateId() {
  const randomPart = Math.random().toString(36).slice(2);
  const timePart = Date.now().toString(36);
  return `rn_${timePart}_${randomPart}`;
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function asPathname(path) {
  if (!path) return "/";
  const value = String(path).trim();
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
}

function getLanguage() {
  try {
    const { NativeModules, Platform } = getReactNative();
    if (Platform.OS === "ios") {
      const settings = NativeModules.SettingsManager?.settings || {};
      return settings.AppleLocale || settings.AppleLanguages?.[0] || "";
    }
    return NativeModules.I18nManager?.localeIdentifier || "";
  } catch {
    return "";
  }
}

function getScreenSize() {
  try {
    const { Dimensions } = getReactNative();
    const screen = Dimensions.get("screen");
    return {
      screenWidth: Math.max(1, Math.round(screen.width || 0)),
      screenHeight: Math.max(1, Math.round(screen.height || 0)),
    };
  } catch {
    return {
      screenWidth: 1,
      screenHeight: 1,
    };
  }
}

function getUserAgent(appVersion) {
  try {
    const { Platform } = getReactNative();
    if (Platform.OS === "android") {
      const version = Platform.Version || "";
      return `Mozilla/5.0 (Linux; Android ${version}) AppleWebKit/537.36 (KHTML, like Gecko) RybbitReactNative/${SDK_VERSION}${appVersion ? ` ${appVersion}` : ""}`;
    }
    if (Platform.OS === "ios") {
      const version = String(Platform.Version || "").replace(/\./g, "_");
      return `Mozilla/5.0 (iPhone; CPU iPhone OS ${version} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) RybbitReactNative/${SDK_VERSION}${appVersion ? ` ${appVersion}` : ""}`;
    }
    return `RybbitReactNative/${SDK_VERSION} (${Platform.OS})${appVersion ? ` ${appVersion}` : ""}`;
  } catch {
    return `RybbitReactNative/${SDK_VERSION}`;
  }
}

class RybbitReactNative {
  constructor() {
    this.config = null;
    this.remoteConfig = {};
    this.storage = createMemoryStorage();
    this.anonymousId = null;
    this.userId = null;
    this.queue = [];
    this.appStateSubscription = null;
  }

  async init(config) {
    if (!config || !config.analyticsHost || !config.siteId) {
      throw new Error("analyticsHost and siteId are required");
    }

    this.config = {
      analyticsHost: trimTrailingSlash(config.analyticsHost),
      siteId: String(config.siteId),
      appIdentifier: config.appIdentifier || config.bundleId || "",
      appVersion: config.appVersion || "",
      tag: config.tag || "",
      storageKeyPrefix: config.storageKeyPrefix || "@rybbit",
      debug: !!config.debug,
      autoTrackAppLifecycle: config.autoTrackAppLifecycle !== false,
      initialScreenName: config.initialScreenName || "",
      configTimeoutMs: config.configTimeoutMs || DEFAULT_CONFIG_TIMEOUT_MS,
      maxQueueSize: config.maxQueueSize || DEFAULT_MAX_QUEUE_SIZE,
      fetch: config.fetch || (typeof fetch === "function" ? fetch : undefined),
    };
    this.storage = config.storage || createMemoryStorage();

    this.anonymousId = await this.getOrCreateAnonymousId();
    this.userId = await this.storage.getItem(this.storageKey("user-id"));
    this.remoteConfig = await this.fetchRemoteConfig();

    if (this.config.autoTrackAppLifecycle) {
      this.setupAppLifecycleTracking();
    }

    if (this.config.initialScreenName && this.remoteConfig.trackInitialPageView !== false) {
      await this.screen(this.config.initialScreenName);
    }

    await this.flush();
  }

  storageKey(name) {
    return `${this.config.storageKeyPrefix}:${this.config.siteId}:${name}`;
  }

  async getOrCreateAnonymousId() {
    const key = this.storageKey("anonymous-id");
    const existing = await this.storage.getItem(key);
    if (existing) return existing;

    const nextId = generateId();
    await this.storage.setItem(key, nextId);
    return nextId;
  }

  async fetchRemoteConfig() {
    try {
      const response = await withTimeout(
        this.config.fetch(`${this.config.analyticsHost}/site/tracking-config/${this.config.siteId}`, {
          method: "GET",
        }),
        this.config.configTimeoutMs
      );
      if (!response.ok) return {};
      return await response.json();
    } catch (error) {
      this.debug("Failed to fetch tracking config", error);
      return {};
    }
  }

  setupAppLifecycleTracking() {
    try {
      const { AppState } = getReactNative();
      let previousState = AppState.currentState;

      if (previousState === "active") {
        this.event("app_open").catch(error => this.debug("Failed to track app_open", error));
      }

      this.appStateSubscription?.remove?.();
      this.appStateSubscription = AppState.addEventListener("change", nextState => {
        if (previousState !== "active" && nextState === "active") {
          this.event("app_open").catch(error => this.debug("Failed to track app_open", error));
        } else if (previousState === "active" && nextState !== "active") {
          this.event("app_background", { state: nextState }).catch(error =>
            this.debug("Failed to track app_background", error)
          );
        }
        previousState = nextState;
      });
    } catch (error) {
      this.debug("Failed to setup AppState tracking", error);
    }
  }

  createBasePayload(context) {
    this.ensureInitialized();
    const screenSize = getScreenSize();
    const appIdentifier = context?.appIdentifier || this.config.appIdentifier || this.config.siteId;

    const payload = {
      site_id: this.config.siteId,
      anonymous_id: this.anonymousId,
      hostname: appIdentifier,
      pathname: asPathname(context?.pathname || context?.screen || "/"),
      querystring: context?.querystring || "",
      screenWidth: screenSize.screenWidth,
      screenHeight: screenSize.screenHeight,
      language: context?.language || getLanguage(),
      page_title: context?.title || context?.screen || "",
      referrer: context?.referrer || "",
      user_agent: context?.userAgent || getUserAgent(this.config.appVersion),
    };

    if (this.userId) payload.user_id = this.userId;
    if (this.config.tag) payload.tag = this.config.tag;

    return payload;
  }

  async send(payload) {
    this.ensureInitialized();
    try {
      const response = await this.config.fetch(`${this.config.analyticsHost}/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Tracking request failed with ${response.status}`);
      }
    } catch (error) {
      this.enqueue(payload);
      this.debug("Failed to send tracking payload", error);
    }
  }

  enqueue(payload) {
    this.queue.push(payload);
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue.shift();
    }
  }

  async flush() {
    this.ensureInitialized();
    if (this.queue.length === 0) return;

    const queued = [...this.queue];
    this.queue = [];
    for (const payload of queued) {
      await this.send(payload);
    }
  }

  async track(type, eventName, properties, context) {
    const payload = {
      ...this.createBasePayload(context),
      type,
      event_name: eventName || "",
    };

    if (properties && Object.keys(properties).length > 0) {
      payload.properties = JSON.stringify(properties);
    }

    await this.send(payload);
  }

  async screen(name, properties, context) {
    const pathname = context?.pathname || asPathname(name);
    await this.track("pageview", "", properties, {
      ...context,
      screen: name,
      pathname,
      title: context?.title || name,
    });
  }

  async pageview(path, context) {
    await this.track("pageview", "", undefined, {
      ...context,
      pathname: path || context?.pathname || "/",
      title: context?.title || "",
    });
  }

  async event(name, properties, context) {
    if (!name || typeof name !== "string") {
      throw new Error("Event name is required and must be a string");
    }
    await this.track("custom_event", name, properties || {}, context);
  }

  async error(error, properties, context) {
    if (this.remoteConfig.trackErrors === false) return;
    const err = error instanceof Error ? error : new Error(String(error));
    await this.track(
      "error",
      err.name || "Error",
      {
        message: String(err.message || "Unknown error").slice(0, 500),
        stack: String(err.stack || "").slice(0, 2000),
        ...(properties || {}),
      },
      context
    );
  }

  async identify(userId, traits) {
    this.ensureInitialized();
    if (!userId || typeof userId !== "string") {
      throw new Error("User ID must be a non-empty string");
    }

    this.userId = userId.trim();
    await this.storage.setItem(this.storageKey("user-id"), this.userId);

    await this.sendIdentify(this.userId, traits, true);
  }

  async setTraits(traits) {
    this.ensureInitialized();
    if (!this.userId) {
      throw new Error("Cannot set traits without identifying user first");
    }
    await this.sendIdentify(this.userId, traits || {}, false);
  }

  async sendIdentify(userId, traits, isNewIdentify) {
    try {
      const response = await this.config.fetch(`${this.config.analyticsHost}/identify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_id: this.config.siteId,
          anonymous_id: this.anonymousId,
          user_id: userId,
          traits,
          is_new_identify: isNewIdentify,
          user_agent: getUserAgent(this.config.appVersion),
        }),
      });

      if (!response.ok) {
        throw new Error(`Identify request failed with ${response.status}`);
      }
    } catch (error) {
      this.debug("Failed to send identify payload", error);
    }
  }

  async clearUserId() {
    this.ensureInitialized();
    this.userId = null;
    await this.storage.removeItem(this.storageKey("user-id"));
  }

  getUserId() {
    return this.userId;
  }

  createNavigationTracker(options) {
    let previousRouteName = null;
    const client = this;
    const getRouteName = options?.getRouteName || (route => route?.name || "");
    const getPath = options?.getPath || (route => route?.path || route?.name || "");
    const includeRouteParams = !!options?.includeRouteParams;

    const trackCurrentRoute = async navigationRef => {
      const route = navigationRef?.getCurrentRoute?.();
      const routeName = getRouteName(route);
      if (!routeName || routeName === previousRouteName) return;

      previousRouteName = routeName;
      await client.screen(routeName, includeRouteParams && route?.params ? { routeParams: route.params } : undefined, {
        pathname: asPathname(getPath(route)),
        screen: routeName,
      });
    };

    return {
      onReady: trackCurrentRoute,
      onStateChange: trackCurrentRoute,
      trackCurrentRoute,
    };
  }

  cleanup() {
    this.appStateSubscription?.remove?.();
    this.appStateSubscription = null;
  }

  ensureInitialized() {
    if (!this.config || !this.anonymousId) {
      throw new Error("rybbit.init() must be called before tracking");
    }
    if (typeof this.config.fetch !== "function") {
      throw new Error("No fetch implementation is available");
    }
  }

  debug(message, error) {
    if (this.config?.debug) {
      console.warn(`[Rybbit] ${message}`, error);
    }
  }
}

const defaultClient = new RybbitReactNative();

module.exports = defaultClient;
module.exports.default = defaultClient;
module.exports.RybbitReactNative = RybbitReactNative;
