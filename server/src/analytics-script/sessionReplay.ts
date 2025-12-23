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
        maskTextSelector?: string;
        slimDOMOptions?: any;
        sampling?: any;
        recordCanvas?: boolean;
        collectFonts?: boolean;
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
      const recordingOptions: any = {
        emit: (event: any) => {
          this.addEvent({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp || Date.now(),
          });
        },
        recordCanvas: false, // Disable canvas recording to reduce data
        collectFonts: true, // Disable font collection to reduce data
        checkoutEveryNms: 60000, // Checkout every 60 seconds (was 30)
        checkoutEveryNth: 500, // Checkout every 500 events (was 200)
        maskAllInputs: true, // Mask all input values for privacy
        maskInputOptions: {
          password: true,
          email: true,
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
          headMetaVerification: true,
        },
        sampling: {
          // Aggressive sampling to reduce data volume
          mousemove: false, // Don't record mouse moves at all
          mouseInteraction: {
            MouseUp: false,
            MouseDown: false,
            Click: true, // Only record clicks
            ContextMenu: false,
            DblClick: true,
            Focus: true,
            Blur: true,
            TouchStart: false,
            TouchEnd: false,
          },
          scroll: 500, // Sample scroll events every 500ms (was 150)
          input: "last", // Only record the final input value
          media: 800, // Sample media interactions less frequently
        },
      };

      // Add custom text masking selectors if configured
      if (this.config.sessionReplayMaskTextSelectors && this.config.sessionReplayMaskTextSelectors.length > 0) {
        recordingOptions.maskTextSelector = this.config.sessionReplayMaskTextSelectors.join(', ');
      }

      this.stopRecordingFn = window.rrweb.record(recordingOptions);

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
