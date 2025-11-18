"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // utils.ts
  function patternToRegex(pattern) {
    const DOUBLE_WILDCARD_TOKEN = "__DOUBLE_ASTERISK_TOKEN__";
    const SINGLE_WILDCARD_TOKEN = "__SINGLE_ASTERISK_TOKEN__";
    let tokenized = pattern.replace(/\*\*/g, DOUBLE_WILDCARD_TOKEN).replace(/\*/g, SINGLE_WILDCARD_TOKEN);
    let escaped = tokenized.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    escaped = escaped.replace(new RegExp(`/${DOUBLE_WILDCARD_TOKEN}/`, "g"), "/(?:.+/)?");
    escaped = escaped.replace(new RegExp(DOUBLE_WILDCARD_TOKEN, "g"), ".*");
    escaped = escaped.replace(/\//g, "\\/");
    let regexPattern = escaped.replace(new RegExp(SINGLE_WILDCARD_TOKEN, "g"), "[^/]+");
    return new RegExp("^" + regexPattern + "$");
  }
  function findMatchingPattern(path, patterns) {
    for (const pattern of patterns) {
      try {
        const regex = patternToRegex(pattern);
        if (regex.test(path)) {
          return pattern;
        }
      } catch (e2) {
        console.error(`Invalid pattern: ${pattern}`, e2);
      }
    }
    return null;
  }
  function debounce(func, wait) {
    let timeout = null;
    return (...args) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => func(...args), wait);
    };
  }
  function isOutboundLink(url) {
    try {
      const currentHost = window.location.hostname;
      const linkHost = new URL(url).hostname;
      return linkHost !== currentHost && linkHost !== "";
    } catch (e2) {
      return false;
    }
  }
  function parseJsonSafely(value, fallback) {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed;
    } catch (e2) {
      console.error("Error parsing JSON:", e2);
      return fallback;
    }
  }

  // config.ts
  async function parseScriptConfig(scriptTag) {
    const src = scriptTag.getAttribute("src");
    if (!src) {
      console.error("Script src attribute is missing");
      return null;
    }
    const analyticsHost = src.split("/script.js")[0];
    if (!analyticsHost) {
      console.error("Please provide a valid analytics host");
      return null;
    }
    const siteId = scriptTag.getAttribute("data-site-id") || scriptTag.getAttribute("site-id");
    if (!siteId) {
      console.error("Please provide a valid site ID using the data-site-id attribute");
      return null;
    }
    const skipPatterns = parseJsonSafely(scriptTag.getAttribute("data-skip-patterns"), []);
    const maskPatterns = parseJsonSafely(scriptTag.getAttribute("data-mask-patterns"), []);
    const sessionReplayMaskTextSelectors = parseJsonSafely(scriptTag.getAttribute("data-replay-mask-text-selectors"), []);
    const debounceDuration = scriptTag.getAttribute("data-debounce") ? Math.max(0, parseInt(scriptTag.getAttribute("data-debounce"))) : 500;
    const sessionReplayBatchSize = scriptTag.getAttribute("data-replay-batch-size") ? Math.max(1, parseInt(scriptTag.getAttribute("data-replay-batch-size"))) : 250;
    const sessionReplayBatchInterval = scriptTag.getAttribute("data-replay-batch-interval") ? Math.max(1e3, parseInt(scriptTag.getAttribute("data-replay-batch-interval"))) : 5e3;
    const defaultConfig = {
      analyticsHost,
      siteId,
      debounceDuration,
      sessionReplayBatchSize,
      sessionReplayBatchInterval,
      sessionReplayMaskTextSelectors,
      skipPatterns,
      maskPatterns,
      // Default all tracking to true initially (will be updated from API)
      autoTrackPageview: true,
      autoTrackSpa: true,
      trackQuerystring: true,
      trackOutbound: true,
      enableWebVitals: false,
      trackErrors: false,
      enableSessionReplay: false
    };
    try {
      const configUrl = `${analyticsHost}/site/${siteId}/tracking-config`;
      const response = await fetch(configUrl, {
        method: "GET",
        // Include credentials if needed for authentication
        credentials: "omit"
      });
      if (response.ok) {
        const apiConfig = await response.json();
        return {
          ...defaultConfig,
          // Map API field names to script config field names
          autoTrackPageview: apiConfig.trackInitialPageView ?? defaultConfig.autoTrackPageview,
          autoTrackSpa: apiConfig.trackSpaNavigation ?? defaultConfig.autoTrackSpa,
          trackQuerystring: apiConfig.trackUrlParams ?? defaultConfig.trackQuerystring,
          trackOutbound: apiConfig.trackOutbound ?? defaultConfig.trackOutbound,
          enableWebVitals: apiConfig.webVitals ?? defaultConfig.enableWebVitals,
          trackErrors: apiConfig.trackErrors ?? defaultConfig.trackErrors,
          enableSessionReplay: apiConfig.sessionReplay ?? defaultConfig.enableSessionReplay
        };
      } else {
        console.warn("Failed to fetch tracking config from API, using defaults");
        return defaultConfig;
      }
    } catch (error) {
      console.warn("Error fetching tracking config:", error);
      return defaultConfig;
    }
  }

  // sessionReplay.ts
  var SessionReplayRecorder = class {
    constructor(config, userId, sendBatch) {
      this.isRecording = false;
      this.eventBuffer = [];
      this.config = config;
      this.userId = userId;
      this.sendBatch = sendBatch;
    }
    async initialize() {
      if (!this.config.enableSessionReplay) {
        return;
      }
      if (!window.rrweb) {
        await this.loadRrweb();
      }
      if (window.rrweb) {
        this.startRecording();
      }
    }
    async loadRrweb() {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${this.config.analyticsHost}/replay.js`;
        script.async = false;
        script.onload = () => {
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load rrweb"));
        document.head.appendChild(script);
      });
    }
    startRecording() {
      if (this.isRecording || !window.rrweb || !this.config.enableSessionReplay) {
        return;
      }
      try {
        const recordingOptions = {
          emit: (event) => {
            this.addEvent({
              type: event.type,
              data: event.data,
              timestamp: event.timestamp || Date.now()
            });
          },
          recordCanvas: false,
          // Disable canvas recording to reduce data
          collectFonts: true,
          // Disable font collection to reduce data
          checkoutEveryNms: 6e4,
          // Checkout every 60 seconds (was 30)
          checkoutEveryNth: 500,
          // Checkout every 500 events (was 200)
          maskAllInputs: true,
          // Mask all input values for privacy
          maskInputOptions: {
            password: true,
            email: true
          },
          slimDOMOptions: {
            script: false,
            comment: true,
            headFavicon: true,
            headWhitespace: true,
            headMetaDescKeywords: true,
            headMetaSocial: true,
            headMetaRobots: true,
            headMetaHttpEquiv: true,
            headMetaAuthorship: true,
            headMetaVerification: true
          },
          sampling: {
            // Aggressive sampling to reduce data volume
            mousemove: false,
            // Don't record mouse moves at all
            mouseInteraction: {
              MouseUp: false,
              MouseDown: false,
              Click: true,
              // Only record clicks
              ContextMenu: false,
              DblClick: true,
              Focus: true,
              Blur: true,
              TouchStart: false,
              TouchEnd: false
            },
            scroll: 500,
            // Sample scroll events every 500ms (was 150)
            input: "last",
            // Only record the final input value
            media: 800
            // Sample media interactions less frequently
          }
        };
        if (this.config.sessionReplayMaskTextSelectors && this.config.sessionReplayMaskTextSelectors.length > 0) {
          recordingOptions.maskTextSelector = this.config.sessionReplayMaskTextSelectors.join(", ");
        }
        this.stopRecordingFn = window.rrweb.record(recordingOptions);
        this.isRecording = true;
        this.setupBatchTimer();
      } catch (error) {
      }
    }
    stopRecording() {
      if (!this.isRecording) {
        return;
      }
      if (this.stopRecordingFn) {
        this.stopRecordingFn();
      }
      this.isRecording = false;
      this.clearBatchTimer();
      if (this.eventBuffer.length > 0) {
        this.flushEvents();
      }
    }
    isActive() {
      return this.isRecording;
    }
    addEvent(event) {
      this.eventBuffer.push(event);
      if (this.eventBuffer.length >= this.config.sessionReplayBatchSize) {
        this.flushEvents();
      }
    }
    setupBatchTimer() {
      this.clearBatchTimer();
      this.batchTimer = window.setInterval(() => {
        if (this.eventBuffer.length > 0) {
          this.flushEvents();
        }
      }, this.config.sessionReplayBatchInterval);
    }
    clearBatchTimer() {
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = void 0;
      }
    }
    async flushEvents() {
      if (this.eventBuffer.length === 0) {
        return;
      }
      const events = [...this.eventBuffer];
      this.eventBuffer = [];
      const batch = {
        userId: this.userId,
        events,
        metadata: {
          pageUrl: window.location.href,
          viewportWidth: screen.width,
          viewportHeight: screen.height,
          language: navigator.language
        }
      };
      try {
        await this.sendBatch(batch);
      } catch (error) {
        this.eventBuffer.unshift(...events);
      }
    }
    // Update user ID when it changes
    updateUserId(userId) {
      this.userId = userId;
    }
    // Handle page navigation for SPAs
    onPageChange() {
      if (this.isRecording) {
        this.flushEvents();
      }
    }
    // Cleanup on page unload
    cleanup() {
      this.stopRecording();
    }
  };

  // tracking.ts
  var Tracker = class {
    constructor(config) {
      this.customUserId = null;
      this.config = config;
      this.loadUserId();
      if (config.enableSessionReplay) {
        this.initializeSessionReplay();
      }
    }
    loadUserId() {
      try {
        const storedUserId = localStorage.getItem("rybbit-user-id");
        if (storedUserId) {
          this.customUserId = storedUserId;
        }
      } catch (e2) {
      }
    }
    async initializeSessionReplay() {
      try {
        this.sessionReplayRecorder = new SessionReplayRecorder(
          this.config,
          this.customUserId || "",
          (batch) => this.sendSessionReplayBatch(batch)
        );
        await this.sessionReplayRecorder.initialize();
      } catch (error) {
        console.error("Failed to initialize session replay:", error);
      }
    }
    async sendSessionReplayBatch(batch) {
      try {
        await fetch(`${this.config.analyticsHost}/session-replay/record/${this.config.siteId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(batch),
          mode: "cors",
          keepalive: false
          // Disable keepalive for large session replay requests
        });
      } catch (error) {
        console.error("Failed to send session replay batch:", error);
        throw error;
      }
    }
    createBasePayload() {
      const url = new URL(window.location.href);
      let pathname = url.pathname;
      if (url.hash && url.hash.startsWith("#/")) {
        pathname = url.hash.substring(1);
      }
      if (findMatchingPattern(pathname, this.config.skipPatterns)) {
        return null;
      }
      const maskMatch = findMatchingPattern(pathname, this.config.maskPatterns);
      if (maskMatch) {
        pathname = maskMatch;
      }
      const payload = {
        site_id: this.config.siteId,
        hostname: url.hostname,
        pathname,
        querystring: this.config.trackQuerystring ? url.search : "",
        screenWidth: screen.width,
        screenHeight: screen.height,
        language: navigator.language,
        page_title: document.title,
        referrer: document.referrer
      };
      if (this.customUserId) {
        payload.user_id = this.customUserId;
      }
      return payload;
    }
    async sendTrackingData(payload) {
      try {
        await fetch(`${this.config.analyticsHost}/track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          mode: "cors",
          keepalive: true
        });
      } catch (error) {
        console.error("Failed to send tracking data:", error);
      }
    }
    track(eventType, eventName = "", properties = {}) {
      if (eventType === "custom_event" && (!eventName || typeof eventName !== "string")) {
        console.error("Event name is required and must be a string for custom events");
        return;
      }
      const basePayload = this.createBasePayload();
      if (!basePayload) {
        return;
      }
      const payload = {
        ...basePayload,
        type: eventType,
        event_name: eventName,
        properties: eventType === "custom_event" || eventType === "outbound" || eventType === "error" ? JSON.stringify(properties) : void 0
      };
      this.sendTrackingData(payload);
    }
    trackPageview() {
      this.track("pageview");
    }
    trackEvent(name, properties = {}) {
      this.track("custom_event", name, properties);
    }
    trackOutbound(url, text = "", target = "_self") {
      this.track("outbound", "", { url, text, target });
    }
    trackWebVitals(vitals) {
      const basePayload = this.createBasePayload();
      if (!basePayload) {
        return;
      }
      const payload = {
        ...basePayload,
        type: "performance",
        event_name: "web-vitals",
        ...vitals
      };
      this.sendTrackingData(payload);
    }
    trackError(error, additionalInfo = {}) {
      const currentOrigin = window.location.origin;
      const filename = additionalInfo.filename || "";
      const errorStack = error.stack || "";
      if (filename) {
        try {
          const fileUrl = new URL(filename);
          if (fileUrl.origin !== currentOrigin) {
            return;
          }
        } catch (e2) {
        }
      } else if (errorStack) {
        if (!errorStack.includes(currentOrigin)) {
          return;
        }
      }
      const errorProperties = {
        message: error.message?.substring(0, 500) || "Unknown error",
        // Truncate to 500 chars
        stack: errorStack.substring(0, 2e3) || ""
        // Truncate to 2000 chars
      };
      if (filename) {
        errorProperties.fileName = filename;
      }
      if (additionalInfo.lineno) {
        const lineNum = typeof additionalInfo.lineno === "string" ? parseInt(additionalInfo.lineno, 10) : additionalInfo.lineno;
        if (lineNum && lineNum !== 0) {
          errorProperties.lineNumber = lineNum;
        }
      }
      if (additionalInfo.colno) {
        const colNum = typeof additionalInfo.colno === "string" ? parseInt(additionalInfo.colno, 10) : additionalInfo.colno;
        if (colNum && colNum !== 0) {
          errorProperties.columnNumber = colNum;
        }
      }
      for (const key in additionalInfo) {
        if (!["lineno", "colno"].includes(key) && additionalInfo[key] !== void 0) {
          errorProperties[key] = additionalInfo[key];
        }
      }
      this.track("error", error.name || "Error", errorProperties);
    }
    identify(userId) {
      if (typeof userId !== "string" || userId.trim() === "") {
        console.error("User ID must be a non-empty string");
        return;
      }
      this.customUserId = userId.trim();
      try {
        localStorage.setItem("rybbit-user-id", this.customUserId);
      } catch (e2) {
        console.warn("Could not persist user ID to localStorage");
      }
      if (this.sessionReplayRecorder) {
        this.sessionReplayRecorder.updateUserId(this.customUserId);
      }
    }
    clearUserId() {
      this.customUserId = null;
      try {
        localStorage.removeItem("rybbit-user-id");
      } catch (e2) {
      }
    }
    getUserId() {
      return this.customUserId;
    }
    // Session Replay methods
    startSessionReplay() {
      if (this.sessionReplayRecorder) {
        this.sessionReplayRecorder.startRecording();
      } else {
        console.warn("Session replay not initialized");
      }
    }
    stopSessionReplay() {
      if (this.sessionReplayRecorder) {
        this.sessionReplayRecorder.stopRecording();
      }
    }
    isSessionReplayActive() {
      return this.sessionReplayRecorder?.isActive() ?? false;
    }
    // Handle page changes for SPA
    onPageChange() {
      if (this.sessionReplayRecorder) {
        this.sessionReplayRecorder.onPageChange();
      }
    }
    // Cleanup
    cleanup() {
      if (this.sessionReplayRecorder) {
        this.sessionReplayRecorder.cleanup();
      }
    }
  };

  // ../../node_modules/web-vitals/dist/web-vitals.js
  var e = -1;
  var t = (t2) => {
    addEventListener("pageshow", (n2) => {
      n2.persisted && (e = n2.timeStamp, t2(n2));
    }, true);
  };
  var n = (e2, t2, n2, i2) => {
    let o2, s2;
    return (r2) => {
      t2.value >= 0 && (r2 || i2) && (s2 = t2.value - (o2 ?? 0), (s2 || void 0 === o2) && (o2 = t2.value, t2.delta = s2, t2.rating = ((e3, t3) => e3 > t3[1] ? "poor" : e3 > t3[0] ? "needs-improvement" : "good")(t2.value, n2), e2(t2)));
    };
  };
  var i = (e2) => {
    requestAnimationFrame(() => requestAnimationFrame(() => e2()));
  };
  var o = () => {
    const e2 = performance.getEntriesByType("navigation")[0];
    if (e2 && e2.responseStart > 0 && e2.responseStart < performance.now()) return e2;
  };
  var s = () => {
    const e2 = o();
    return e2?.activationStart ?? 0;
  };
  var r = (t2, n2 = -1) => {
    const i2 = o();
    let r2 = "navigate";
    e >= 0 ? r2 = "back-forward-cache" : i2 && (document.prerendering || s() > 0 ? r2 = "prerender" : document.wasDiscarded ? r2 = "restore" : i2.type && (r2 = i2.type.replace(/_/g, "-")));
    return { name: t2, value: n2, rating: "good", delta: 0, entries: [], id: `v5-${Date.now()}-${Math.floor(8999999999999 * Math.random()) + 1e12}`, navigationType: r2 };
  };
  var c = /* @__PURE__ */ new WeakMap();
  function a(e2, t2) {
    return c.get(e2) || c.set(e2, new t2()), c.get(e2);
  }
  var d = class {
    constructor() {
      __publicField(this, "t");
      __publicField(this, "i", 0);
      __publicField(this, "o", []);
    }
    h(e2) {
      if (e2.hadRecentInput) return;
      const t2 = this.o[0], n2 = this.o.at(-1);
      this.i && t2 && n2 && e2.startTime - n2.startTime < 1e3 && e2.startTime - t2.startTime < 5e3 ? (this.i += e2.value, this.o.push(e2)) : (this.i = e2.value, this.o = [e2]), this.t?.(e2);
    }
  };
  var h = (e2, t2, n2 = {}) => {
    try {
      if (PerformanceObserver.supportedEntryTypes.includes(e2)) {
        const i2 = new PerformanceObserver((e3) => {
          Promise.resolve().then(() => {
            t2(e3.getEntries());
          });
        });
        return i2.observe({ type: e2, buffered: true, ...n2 }), i2;
      }
    } catch {
    }
  };
  var f = (e2) => {
    let t2 = false;
    return () => {
      t2 || (e2(), t2 = true);
    };
  };
  var u = -1;
  var l = () => "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0;
  var m = (e2) => {
    "hidden" === document.visibilityState && u > -1 && (u = "visibilitychange" === e2.type ? e2.timeStamp : 0, v());
  };
  var g = () => {
    addEventListener("visibilitychange", m, true), addEventListener("prerenderingchange", m, true);
  };
  var v = () => {
    removeEventListener("visibilitychange", m, true), removeEventListener("prerenderingchange", m, true);
  };
  var p = () => {
    if (u < 0) {
      const e2 = s(), n2 = document.prerendering ? void 0 : globalThis.performance.getEntriesByType("visibility-state").filter((t2) => "hidden" === t2.name && t2.startTime > e2)[0]?.startTime;
      u = n2 ?? l(), g(), t(() => {
        setTimeout(() => {
          u = l(), g();
        });
      });
    }
    return { get firstHiddenTime() {
      return u;
    } };
  };
  var y = (e2) => {
    document.prerendering ? addEventListener("prerenderingchange", () => e2(), true) : e2();
  };
  var b = [1800, 3e3];
  var P = (e2, o2 = {}) => {
    y(() => {
      const c2 = p();
      let a2, d2 = r("FCP");
      const f2 = h("paint", (e3) => {
        for (const t2 of e3) "first-contentful-paint" === t2.name && (f2.disconnect(), t2.startTime < c2.firstHiddenTime && (d2.value = Math.max(t2.startTime - s(), 0), d2.entries.push(t2), a2(true)));
      });
      f2 && (a2 = n(e2, d2, b, o2.reportAllChanges), t((t2) => {
        d2 = r("FCP"), a2 = n(e2, d2, b, o2.reportAllChanges), i(() => {
          d2.value = performance.now() - t2.timeStamp, a2(true);
        });
      }));
    });
  };
  var T = [0.1, 0.25];
  var E = (e2, o2 = {}) => {
    P(f(() => {
      let s2, c2 = r("CLS", 0);
      const f2 = a(o2, d), u2 = (e3) => {
        for (const t2 of e3) f2.h(t2);
        f2.i > c2.value && (c2.value = f2.i, c2.entries = f2.o, s2());
      }, l2 = h("layout-shift", u2);
      l2 && (s2 = n(e2, c2, T, o2.reportAllChanges), document.addEventListener("visibilitychange", () => {
        "hidden" === document.visibilityState && (u2(l2.takeRecords()), s2(true));
      }), t(() => {
        f2.i = 0, c2 = r("CLS", 0), s2 = n(e2, c2, T, o2.reportAllChanges), i(() => s2());
      }), setTimeout(s2));
    }));
  };
  var _ = 0;
  var L = 1 / 0;
  var M = 0;
  var C = (e2) => {
    for (const t2 of e2) t2.interactionId && (L = Math.min(L, t2.interactionId), M = Math.max(M, t2.interactionId), _ = M ? (M - L) / 7 + 1 : 0);
  };
  var I;
  var w = () => I ? _ : performance.interactionCount ?? 0;
  var F = () => {
    "interactionCount" in performance || I || (I = h("event", C, { type: "event", buffered: true, durationThreshold: 0 }));
  };
  var k = 0;
  var A = class {
    constructor() {
      __publicField(this, "u", []);
      __publicField(this, "l", /* @__PURE__ */ new Map());
      __publicField(this, "m");
      __publicField(this, "v");
    }
    p() {
      k = w(), this.u.length = 0, this.l.clear();
    }
    P() {
      const e2 = Math.min(this.u.length - 1, Math.floor((w() - k) / 50));
      return this.u[e2];
    }
    h(e2) {
      if (this.m?.(e2), !e2.interactionId && "first-input" !== e2.entryType) return;
      const t2 = this.u.at(-1);
      let n2 = this.l.get(e2.interactionId);
      if (n2 || this.u.length < 10 || e2.duration > t2.T) {
        if (n2 ? e2.duration > n2.T ? (n2.entries = [e2], n2.T = e2.duration) : e2.duration === n2.T && e2.startTime === n2.entries[0].startTime && n2.entries.push(e2) : (n2 = { id: e2.interactionId, entries: [e2], T: e2.duration }, this.l.set(n2.id, n2), this.u.push(n2)), this.u.sort((e3, t3) => t3.T - e3.T), this.u.length > 10) {
          const e3 = this.u.splice(10);
          for (const t3 of e3) this.l.delete(t3.id);
        }
        this.v?.(n2);
      }
    }
  };
  var B = (e2) => {
    const t2 = globalThis.requestIdleCallback || setTimeout;
    "hidden" === document.visibilityState ? e2() : (e2 = f(e2), document.addEventListener("visibilitychange", e2, { once: true }), t2(() => {
      e2(), document.removeEventListener("visibilitychange", e2);
    }));
  };
  var N = [200, 500];
  var S = (e2, i2 = {}) => {
    globalThis.PerformanceEventTiming && "interactionId" in PerformanceEventTiming.prototype && y(() => {
      F();
      let o2, s2 = r("INP");
      const c2 = a(i2, A), d2 = (e3) => {
        B(() => {
          for (const t3 of e3) c2.h(t3);
          const t2 = c2.P();
          t2 && t2.T !== s2.value && (s2.value = t2.T, s2.entries = t2.entries, o2());
        });
      }, f2 = h("event", d2, { durationThreshold: i2.durationThreshold ?? 40 });
      o2 = n(e2, s2, N, i2.reportAllChanges), f2 && (f2.observe({ type: "first-input", buffered: true }), document.addEventListener("visibilitychange", () => {
        "hidden" === document.visibilityState && (d2(f2.takeRecords()), o2(true));
      }), t(() => {
        c2.p(), s2 = r("INP"), o2 = n(e2, s2, N, i2.reportAllChanges);
      }));
    });
  };
  var q = class {
    constructor() {
      __publicField(this, "m");
    }
    h(e2) {
      this.m?.(e2);
    }
  };
  var x = [2500, 4e3];
  var O = (e2, o2 = {}) => {
    y(() => {
      const c2 = p();
      let d2, u2 = r("LCP");
      const l2 = a(o2, q), m2 = (e3) => {
        o2.reportAllChanges || (e3 = e3.slice(-1));
        for (const t2 of e3) l2.h(t2), t2.startTime < c2.firstHiddenTime && (u2.value = Math.max(t2.startTime - s(), 0), u2.entries = [t2], d2());
      }, g2 = h("largest-contentful-paint", m2);
      if (g2) {
        d2 = n(e2, u2, x, o2.reportAllChanges);
        const s2 = f(() => {
          m2(g2.takeRecords()), g2.disconnect(), d2(true);
        });
        for (const e3 of ["keydown", "click", "visibilitychange"]) addEventListener(e3, () => B(s2), { capture: true, once: true });
        t((t2) => {
          u2 = r("LCP"), d2 = n(e2, u2, x, o2.reportAllChanges), i(() => {
            u2.value = performance.now() - t2.timeStamp, d2(true);
          });
        });
      }
    });
  };
  var $ = [800, 1800];
  var D = (e2) => {
    document.prerendering ? y(() => D(e2)) : "complete" !== document.readyState ? addEventListener("load", () => D(e2), true) : setTimeout(e2);
  };
  var H = (e2, i2 = {}) => {
    let c2 = r("TTFB"), a2 = n(e2, c2, $, i2.reportAllChanges);
    D(() => {
      const d2 = o();
      d2 && (c2.value = Math.max(d2.responseStart - s(), 0), c2.entries = [d2], a2(true), t(() => {
        c2 = r("TTFB", 0), a2 = n(e2, c2, $, i2.reportAllChanges), a2(true);
      }));
    });
  };

  // webVitals.ts
  var WebVitalsCollector = class {
    constructor(onReady) {
      this.data = {
        lcp: null,
        cls: null,
        inp: null,
        fcp: null,
        ttfb: null
      };
      this.sent = false;
      this.timeout = null;
      this.onReadyCallback = null;
      this.onReadyCallback = onReady;
    }
    initialize() {
      try {
        O(this.collectMetric.bind(this));
        E(this.collectMetric.bind(this));
        S(this.collectMetric.bind(this));
        P(this.collectMetric.bind(this));
        H(this.collectMetric.bind(this));
        this.timeout = setTimeout(() => {
          if (!this.sent) {
            this.sendData();
          }
        }, 2e4);
        window.addEventListener("beforeunload", () => {
          if (!this.sent) {
            this.sendData();
          }
        });
      } catch (e2) {
        console.warn("Error initializing web vitals tracking:", e2);
      }
    }
    collectMetric(metric) {
      if (this.sent) return;
      const metricName = metric.name.toLowerCase();
      this.data[metricName] = metric.value;
      const allCollected = Object.values(this.data).every((value) => value !== null);
      if (allCollected) {
        this.sendData();
      }
    }
    sendData() {
      if (this.sent) return;
      this.sent = true;
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      if (this.onReadyCallback) {
        this.onReadyCallback(this.data);
      }
    }
    getData() {
      return { ...this.data };
    }
  };

  // index.ts
  (async function() {
    const scriptTag = document.currentScript;
    if (!scriptTag) {
      console.error("Could not find current script tag");
      return;
    }
    if (window.__RYBBIT_OPTOUT__ || localStorage.getItem("disable-rybbit") !== null) {
      window.rybbit = {
        pageview: () => {
        },
        event: () => {
        },
        error: () => {
        },
        trackOutbound: () => {
        },
        identify: () => {
        },
        clearUserId: () => {
        },
        getUserId: () => null,
        startSessionReplay: () => {
        },
        stopSessionReplay: () => {
        },
        isSessionReplayActive: () => false
      };
      return;
    }
    const config = await parseScriptConfig(scriptTag);
    if (!config) {
      return;
    }
    const tracker = new Tracker(config);
    if (config.enableWebVitals) {
      const webVitalsCollector = new WebVitalsCollector((vitals) => {
        tracker.trackWebVitals(vitals);
      });
      webVitalsCollector.initialize();
    }
    if (config.trackErrors) {
      window.addEventListener("error", (event) => {
        tracker.trackError(event.error || new Error(event.message), {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        tracker.trackError(error, {
          type: "unhandledrejection"
        });
      });
    }
    const trackPageview = () => tracker.trackPageview();
    const debouncedTrackPageview = config.debounceDuration > 0 ? debounce(trackPageview, config.debounceDuration) : trackPageview;
    function setupEventListeners() {
      document.addEventListener("click", function(e2) {
        let target = e2.target;
        while (target && target !== document.documentElement) {
          if (target.hasAttribute("data-rybbit-event")) {
            const eventName = target.getAttribute("data-rybbit-event");
            if (eventName) {
              const properties = {};
              for (const attr of target.attributes) {
                if (attr.name.startsWith("data-rybbit-prop-")) {
                  const propName = attr.name.replace("data-rybbit-prop-", "");
                  properties[propName] = attr.value;
                }
              }
              tracker.trackEvent(eventName, properties);
            }
            break;
          }
          target = target.parentElement;
        }
        if (config.trackOutbound) {
          const link = e2.target.closest("a");
          if (link?.href && isOutboundLink(link.href)) {
            tracker.trackOutbound(link.href, link.innerText || link.textContent || "", link.target || "_self");
          }
        }
      });
      if (config.autoTrackSpa) {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        history.pushState = function(...args) {
          originalPushState.apply(this, args);
          debouncedTrackPageview();
          tracker.onPageChange();
        };
        history.replaceState = function(...args) {
          originalReplaceState.apply(this, args);
          debouncedTrackPageview();
          tracker.onPageChange();
        };
        window.addEventListener("popstate", () => {
          debouncedTrackPageview();
          tracker.onPageChange();
        });
        window.addEventListener("hashchange", () => {
          debouncedTrackPageview();
          tracker.onPageChange();
        });
      }
    }
    window.rybbit = {
      pageview: () => tracker.trackPageview(),
      event: (name, properties = {}) => tracker.trackEvent(name, properties),
      error: (error, properties = {}) => tracker.trackError(error, properties),
      trackOutbound: (url, text = "", target = "_self") => tracker.trackOutbound(url, text, target),
      identify: (userId) => tracker.identify(userId),
      clearUserId: () => tracker.clearUserId(),
      getUserId: () => tracker.getUserId(),
      startSessionReplay: () => tracker.startSessionReplay(),
      stopSessionReplay: () => tracker.stopSessionReplay(),
      isSessionReplayActive: () => tracker.isSessionReplayActive()
    };
    setupEventListeners();
    window.addEventListener("beforeunload", () => {
      tracker.cleanup();
    });
    if (config.autoTrackPageview) {
      tracker.trackPageview();
    }
  })();
})();
