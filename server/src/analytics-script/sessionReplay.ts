import { ScriptConfig, SessionReplayEvent, SessionReplayBatch } from "./types.js";

// rrweb types (simplified for our use case)
declare global {
  interface Window {
    rrweb?: {
      record: (options: {
        emit: (event: any) => void;
        checkoutEveryNms?: number;
        checkoutEveryNth?: number;
        maskAllInputs?: boolean;
        maskInputOptions?: any;
        slimDOMOptions?: any;
        sampling?: any;
        recordCanvas?: boolean;
        collectFonts?: boolean;
        blockClass?: string;
        blockSelector?: string;
        ignoreClass?: string;
        ignoreSelector?: string;
        inlineStylesheet?: boolean;
        dataURLOptions?: {
          type?: string;
          quality?: number;
        };
      }) => () => void;
    };
  }
}

export class SessionReplayRecorder {
  private config: ScriptConfig;
  private isRecording: boolean = false;
  private stopRecordingFn?: () => void;
  private userId: string;
  private eventBuffer: SessionReplayEvent[] = [];
  private batchTimer?: number;
  private sendBatch: (batch: SessionReplayBatch) => Promise<void>;

  constructor(config: ScriptConfig, userId: string, sendBatch: (batch: SessionReplayBatch) => Promise<void>) {
    this.config = config;
    this.userId = userId;
    this.sendBatch = sendBatch;
  }

  async initialize(): Promise<void> {
    if (!this.config.enableSessionReplay) {
      return;
    }

    // Load rrweb if not already loaded
    if (!window.rrweb) {
      await this.loadRrweb();
    }

    if (window.rrweb) {
      this.startRecording();
    }
  }

  private async loadRrweb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      // Load from same origin to avoid CDN blocking
      script.src = `${this.config.analyticsHost}/replay.js`;
      script.async = false;
      script.onload = () => {
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load rrweb"));
      document.head.appendChild(script);
    });
  }

  public startRecording(): void {
    if (this.isRecording || !window.rrweb || !this.config.enableSessionReplay) {
      return;
    }

    try {
      this.stopRecordingFn = window.rrweb.record({
        emit: event => {
          this.addEvent({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp || Date.now(),
          });
        },
        recordCanvas: false, // Disable canvas recording to save space
        collectFonts: true, // Keep font collection (minimal overhead ~1-2KB)
        checkoutEveryNms: 60000, // Checkout every 60 seconds (less frequent)
        checkoutEveryNth: 300, // Checkout every 300 events (less frequent)
        maskAllInputs: true, // Mask all input values for privacy
        maskInputOptions: {
          password: true,
          email: true,
        },
        // Aggressively slim DOM to reduce storage
        slimDOMOptions: {
          script: true, // Remove script content
          comment: true, // Remove comments
          headFavicon: true, // Remove favicon
          headWhitespace: true, // Remove whitespace in head
          headMetaDescKeywords: true, // Remove meta description/keywords
          headMetaSocial: true, // Remove social meta tags
          headMetaRobots: true, // Remove robots meta
          headMetaHttpEquiv: true, // Remove http-equiv meta
          headMetaAuthorship: true, // Remove authorship meta
          headMetaVerification: true, // Remove verification meta
        },
        // Balanced sampling for good replay quality vs storage
        sampling: {
          mousemove: false, // Disable mouse move tracking (this saves significant space)
          mouseInteraction: true, // Keep mouse clicks/hovers (minimal overhead)
          scroll: 200, // Sample scroll every 200ms for smooth replay
          input: "last", // Only record the final input value
          media: 800, // Sample media interactions every 800ms
        },
        // Block elements with heavy animations or frequent updates
        blockClass: "rr-block",
        blockSelector: ".spinner, .skeleton, .loading, [data-loading], .animate-pulse, .animate-spin, .animate-bounce",
        ignoreClass: "rr-ignore",
        ignoreSelector: ".progress-bar, .carousel, .slider",
        // Keep inline stylesheets for accurate replay
        inlineStylesheet: true,
        // Optimize canvas data URLs if canvas recording is ever enabled
        dataURLOptions: {
          type: "image/webp",
          quality: 0.6,
        },
      });

      this.isRecording = true;
      this.setupBatchTimer();
    } catch (error) {
      // Recording failed silently
    }
  }

  public stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    if (this.stopRecordingFn) {
      this.stopRecordingFn();
    }

    this.isRecording = false;
    this.clearBatchTimer();

    // Send any remaining events
    if (this.eventBuffer.length > 0) {
      this.flushEvents();
    }
  }

  public isActive(): boolean {
    return this.isRecording;
  }

  private addEvent(event: SessionReplayEvent): void {
    this.eventBuffer.push(event);

    // Auto-flush if buffer is full
    if (this.eventBuffer.length >= this.config.sessionReplayBatchSize) {
      this.flushEvents();
    }
  }

  private setupBatchTimer(): void {
    this.clearBatchTimer();
    this.batchTimer = window.setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flushEvents();
      }
    }, this.config.sessionReplayBatchInterval);
  }

  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    const batch: SessionReplayBatch = {
      userId: this.userId,
      events,
      metadata: {
        pageUrl: window.location.href,
        viewportWidth: screen.width,
        viewportHeight: screen.height,
        language: navigator.language,
      },
    };

    try {
      await this.sendBatch(batch);
    } catch (error) {
      // Re-queue the events for retry since this batch failed
      this.eventBuffer.unshift(...events);
    }
  }

  // Update user ID when it changes
  public updateUserId(userId: string): void {
    this.userId = userId;
  }

  // Handle page navigation for SPAs
  public onPageChange(): void {
    if (this.isRecording) {
      // Flush current events before page change
      this.flushEvents();
    }
  }

  // Cleanup on page unload
  public cleanup(): void {
    this.stopRecording();
  }
}
