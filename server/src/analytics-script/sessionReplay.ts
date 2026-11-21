import { ScriptConfig, SessionReplayEvent, SessionReplayBatch, SessionReplayBatchResult } from "./types.js";
import { getBotSignalMask } from "./botSignals.js";

type SendSessionReplayBatch = (batch: SessionReplayBatch) => Promise<SessionReplayBatchResult | void>;

const SAMPLE_STORAGE_KEY = "rybbit-replay-sampled";

// Batches that left before a requested snapshot reached the server ask for one
// too; this covers the snapshot's own round trip and a retry.
const FULL_SNAPSHOT_REQUEST_INTERVAL_MS = 10_000;

/**
 * Determines if this session should have replay enabled based on sample rate.
 * Uses sessionStorage to persist the decision for the entire browser session.
 */
function shouldSampleSession(sampleRate: number): boolean {
  // 100% = always record, 0% = never record
  if (sampleRate >= 100) return true;
  if (sampleRate <= 0) return false;

  // Check if we already made a decision for this session
  try {
    const existingDecision = sessionStorage.getItem(SAMPLE_STORAGE_KEY);
    if (existingDecision !== null) {
      return existingDecision === "1";
    }

    // Make new sampling decision
    const sampled = Math.random() * 100 < sampleRate;
    sessionStorage.setItem(SAMPLE_STORAGE_KEY, sampled ? "1" : "0");

    return sampled;
  } catch {
    // sessionStorage not available, default to sampling
    return Math.random() * 100 < sampleRate;
  }
}

// rrweb types (simplified for our use case)
declare global {
  interface Window {
    rrweb?: {
      record: ((options: {
        emit: (event: any) => void;
        checkoutEveryNms?: number;
        checkoutEveryNth?: number;
        blockClass?: string | RegExp;
        blockSelector?: string;
        ignoreClass?: string | RegExp;
        ignoreSelector?: string;
        maskTextClass?: string | RegExp;
        maskTextSelector?: string;
        maskAllInputs?: boolean;
        maskInputOptions?: Record<string, boolean>;
        slimDOMOptions?: Record<string, boolean> | boolean;
        sampling?: Record<string, any>;
        recordCanvas?: boolean;
        collectFonts?: boolean;
      }) => () => void) & {
        takeFullSnapshot?: (isCheckout?: boolean) => void;
      };
    };
  }
}

export class SessionReplayRecorder {
  private config: ScriptConfig;
  private isRecording: boolean = false;
  // Set once the server reports the session is over its size cap; recording
  // stays off for the rest of this page.
  private capped: boolean = false;
  private stopRecordingFn?: () => void;
  private userId: string;
  private eventBuffer: SessionReplayEvent[] = [];
  // Batches whose send failed, each kept as it was built so a retry after
  // identify(), clearUserId() or a navigation still carries the identity and
  // page it was recorded under.
  private failedBatches: SessionReplayBatch[] = [];
  private batchTimer?: number;
  private lastFullSnapshotRequestAt = -Infinity;
  private deferredSnapshotTimer?: number;
  private sendBatch: SendSessionReplayBatch;

  constructor(config: ScriptConfig, userId: string, sendBatch: SendSessionReplayBatch) {
    this.config = config;
    this.userId = userId;
    this.sendBatch = sendBatch;

    // The page may be about to unload: send what's buffered now (batches go
    // with keepalive while they fit) so the end of the replay survives it.
    // Recording itself carries on — a hidden tab can come back, and a page
    // restored from the back/forward cache resumes with its recorder intact,
    // which stopping on beforeunload broke.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void this.flushEvents();
      }
    });
    window.addEventListener("pagehide", () => void this.flushEvents());
  }

  async initialize(): Promise<void> {
    if (!this.config.enableSessionReplay) {
      return;
    }

    // Check sample rate if specified
    const sampleRate = this.config.sessionReplaySampleRate;
    if (sampleRate !== undefined && !shouldSampleSession(sampleRate)) {
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
    if (this.capped || this.isRecording || !window.rrweb || !this.config.enableSessionReplay) {
      return;
    }

    try {
      // Default sampling configuration (can be overridden via config)
      const defaultSampling = {
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
        scroll: 500, // Sample scroll events every 500ms
        input: "last", // Only record the final input value
        media: 800, // Sample media interactions less frequently
      };

      // Default slimDOMOptions (can be overridden via config)
      const defaultSlimDOMOptions = {
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
      };

      const recordingOptions: any = {
        emit: (event: any) => {
          this.addEvent({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp || Date.now(),
          });
        },
        recordCanvas: false, // Always disabled to save disk space
        checkoutEveryNms: 60000, // Checkout every 60 seconds
        checkoutEveryNth: 500, // Checkout every 500 events
        // Use config values with fallbacks to defaults
        blockClass: this.config.sessionReplayBlockClass ?? 'rr-block',
        blockSelector: this.config.sessionReplayBlockSelector ?? null,
        ignoreClass: this.config.sessionReplayIgnoreClass ?? 'rr-ignore',
        ignoreSelector: this.config.sessionReplayIgnoreSelector ?? null,
        maskTextClass: this.config.sessionReplayMaskTextClass ?? 'rr-mask',
        maskAllInputs: this.config.sessionReplayMaskAllInputs ?? true,
        maskInputOptions: this.config.sessionReplayMaskInputOptions ?? { password: true, email: true },
        collectFonts: this.config.sessionReplayCollectFonts ?? true,
        sampling: this.config.sessionReplaySampling ?? defaultSampling,
        slimDOMOptions: this.config.sessionReplaySlimDOMOptions ?? defaultSlimDOMOptions,
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
    if (this.deferredSnapshotTimer !== undefined) {
      clearTimeout(this.deferredSnapshotTimer);
      this.deferredSnapshotTimer = undefined;
    }

    // Send any remaining events, and retry failed batches while there's a chance
    if (this.eventBuffer.length > 0 || this.failedBatches.length > 0) {
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
      if (this.eventBuffer.length > 0 || this.failedBatches.length > 0) {
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

  // Sends the buffered events, and retries the batches that failed before.
  private async flushEvents(): Promise<void> {
    const batches = this.failedBatches;
    this.failedBatches = [];

    if (this.eventBuffer.length > 0) {
      // Built before the first await, so the identity and page are the ones
      // the events were recorded under.
      batches.push({
        userId: this.userId,
        events: this.eventBuffer,
        metadata: {
          pageUrl: window.location.href,
          viewportWidth: screen.width,
          viewportHeight: screen.height,
          language: navigator.language,
        },
        _bsm: getBotSignalMask(),
      });
      this.eventBuffer = [];
    }

    await Promise.all(batches.map(batch => this.sendOrRequeue(batch)));
  }

  private async sendOrRequeue(batch: SessionReplayBatch): Promise<void> {
    try {
      const result = await this.sendBatch(batch);
      if (result?.stopRecording) {
        this.stopForSizeCap();
      } else if (result?.takeFullSnapshot) {
        this.takeFullSnapshot();
      } else if (this.deferredSnapshotTimer !== undefined && batch.events.some(event => event.type === 2)) {
        // The server accepted a snapshot without asking for another.
        clearTimeout(this.deferredSnapshotTimer);
        this.deferredSnapshotTimer = undefined;
      }
    } catch (error) {
      if (!this.capped) {
        this.requeue(batch);
      }
    }
  }

  // A failure from the same identity and page as the last queued one joins it,
  // so an outage retries one batch per flush rather than one per failed send.
  private requeue(batch: SessionReplayBatch): void {
    const last = this.failedBatches[this.failedBatches.length - 1];
    if (last && last.userId === batch.userId && JSON.stringify(last.metadata) === JSON.stringify(batch.metadata)) {
      last.events = last.events.concat(batch.events);
      return;
    }
    this.failedBatches.push(batch);
  }

  // The server keeps the replay in its previous session until a batch opens
  // the visitor's new one with a full snapshot, without which a replay can't
  // be played. Events recorded before the snapshot go first, to the old one.
  private takeFullSnapshot(): void {
    if (!this.isRecording) {
      return;
    }
    // A request inside the cooldown (e.g. identify() right after a rollover)
    // runs when it ends rather than being dropped: the newer session needs
    // its own snapshot too.
    const wait = this.lastFullSnapshotRequestAt + FULL_SNAPSHOT_REQUEST_INTERVAL_MS - Date.now();
    if (wait > 0) {
      if (this.deferredSnapshotTimer === undefined) {
        this.deferredSnapshotTimer = window.setTimeout(() => {
          this.deferredSnapshotTimer = undefined;
          this.takeFullSnapshot();
        }, wait);
      }
      return;
    }
    this.lastFullSnapshotRequestAt = Date.now();

    void this.flushEvents();
    try {
      window.rrweb?.record.takeFullSnapshot?.(true);
    } catch {
      // rrweb isn't recording after all; its next checkout brings the snapshot.
    }
    void this.flushEvents();
  }

  // Unlike stopRecording, drops what's buffered: the server refuses it anyway.
  private stopForSizeCap(): void {
    this.capped = true;
    if (this.stopRecordingFn) {
      this.stopRecordingFn();
      this.stopRecordingFn = undefined;
    }
    this.isRecording = false;
    this.clearBatchTimer();
    this.eventBuffer = [];
    this.failedBatches = [];
  }

  // Update user ID when it changes
  public updateUserId(userId: string): void {
    if (userId === this.userId) {
      return;
    }

    // Keep events captured under the previous identity in their original batch.
    // flushEvents builds the batch before its first await, so the identity can
    // be changed immediately after starting the send.
    if (this.eventBuffer.length > 0) {
      void this.flushEvents();
    }

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
