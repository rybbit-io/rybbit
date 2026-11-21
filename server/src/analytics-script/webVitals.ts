import { onLCP, onCLS, onINP, onFCP, onTTFB, Metric } from "web-vitals";
import { WebVitalsData } from "./types.js";

// The metrics are sent as a single snapshot of the first 20 seconds of the page,
// or earlier if the page is hidden first. Sending later (at unload) would land
// performance events long after the pageview, stretching or splitting sessions.
const SEND_DELAY_MS = 20000;

export class WebVitalsCollector {
  private data: WebVitalsData = {
    lcp: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null,
  };

  private sent = false;
  private timeout: NodeJS.Timeout | null = null;
  private onReadyCallback: ((data: WebVitalsData) => void) | null = null;

  constructor(onReady: (data: WebVitalsData) => void) {
    this.onReadyCallback = onReady;
  }

  initialize(): void {
    try {
      // By default web-vitals holds LCP, CLS and INP back until the visitor
      // interacts or the page is hidden, so a snapshot taken before then would
      // have them as null. reportAllChanges records every update as it happens.
      // Each call needs its own options object: web-vitals keys per-metric state
      // on it, so a shared object hands CLS and INP the LCP state and breaks them.
      onLCP(this.collectMetric.bind(this), { reportAllChanges: true });
      onCLS(this.collectMetric.bind(this), { reportAllChanges: true });
      onINP(this.collectMetric.bind(this), { reportAllChanges: true });

      // Track additional metrics
      onFCP(this.collectMetric.bind(this));
      onTTFB(this.collectMetric.bind(this));

      this.timeout = setTimeout(() => this.sendData(), SEND_DELAY_MS);

      // Send early when the page is hidden (tab switch, navigation, close).
      // web-vitals flushes its final values from a capturing window listener,
      // which runs before this one. pagehide covers older Safari, which could
      // unload without firing visibilitychange.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.sendData();
        }
      });
      window.addEventListener("pagehide", () => this.sendData());
    } catch (e) {
      console.warn("Error initializing web vitals tracking:", e);
    }
  }

  private collectMetric(metric: Metric): void {
    if (this.sent) return;

    const metricName = metric.name.toLowerCase() as keyof WebVitalsData;
    this.data[metricName] = metric.value;
  }

  private sendData(): void {
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

  getData(): WebVitalsData {
    return { ...this.data };
  }
}
