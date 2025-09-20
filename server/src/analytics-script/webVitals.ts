import { onLCP, onCLS, onINP, onFCP, onTTFB, Metric } from "web-vitals";
import { WebVitalsData } from "./types.js";

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
      // Track Core Web Vitals
      onLCP(this.collectMetric.bind(this));
      onCLS(this.collectMetric.bind(this));
      onINP(this.collectMetric.bind(this));

      // Track additional metrics
      onFCP(this.collectMetric.bind(this));
      onTTFB(this.collectMetric.bind(this));

      // Set timeout to send metrics even if not all are collected
      this.timeout = setTimeout(() => {
        if (!this.sent) {
          this.sendData();
        }
      }, 20000);

      // Send on page unload
      window.addEventListener("beforeunload", () => {
        if (!this.sent) {
          this.sendData();
        }
      });
    } catch (e) {
      console.warn("Error initializing web vitals tracking:", e);
    }
  }

  private collectMetric(metric: Metric): void {
    if (this.sent) return;

    const metricName = metric.name.toLowerCase() as keyof WebVitalsData;
    this.data[metricName] = metric.value;

    // Check if all metrics are collected
    const allCollected = Object.values(this.data).every(value => value !== null);
    if (allCollected) {
      this.sendData();
    }
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
