import { createServiceLogger } from "../../lib/logger/logger.js";

type QueueEntry<T> = {
  value: T;
  attempts: number;
  resolve: () => void;
  reject: (error: Error) => void;
};

type ProcessQueueOptions = {
  ignoreBackoff?: boolean;
};

type ReliableBatchQueueOptions<T> = {
  batchSize: number;
  flushIntervalMs: number;
  maxAttempts?: number;
  maxQueueSize?: number;
  name: string;
  processBatch: (batch: T[]) => Promise<void>;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_QUEUE_SIZE = 50_000;
const MAX_RETRY_DELAY_MS = 1_000;

export class QueueClosedError extends Error {
  constructor(queueName: string) {
    super(`${queueName} is shutting down`);
  }
}

export class QueueFullError extends Error {
  constructor(queueName: string, maxQueueSize: number) {
    super(`${queueName} reached its ${maxQueueSize}-event capacity`);
  }
}

/**
 * Small request-backed batching primitive: callers are resolved only after the
 * batch reaches durable storage. Failed batches stay queued for bounded retries;
 * once retries are exhausted callers receive an error instead of a false 200.
 */
export class ReliableBatchQueue<T> {
  private queue: QueueEntry<T>[] = [];
  private processing = false;
  private closing = false;
  private nextAttemptAt = 0;
  private intervalHandle: ReturnType<typeof setInterval>;
  private activeProcess: Promise<void> | null = null;
  private readonly logger;
  private readonly maxAttempts: number;
  private readonly maxQueueSize: number;

  constructor(private readonly options: ReliableBatchQueueOptions<T>) {
    this.logger = createServiceLogger(options.name);
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    this.intervalHandle = setInterval(() => void this.processQueue(), options.flushIntervalMs);
  }

  add(value: T): Promise<void> {
    if (this.closing) {
      return Promise.reject(new QueueClosedError(this.options.name));
    }
    if (this.queue.length >= this.maxQueueSize) {
      return Promise.reject(new QueueFullError(this.options.name, this.maxQueueSize));
    }

    const delivery = new Promise<void>((resolve, reject) => {
      this.queue.push({ value, attempts: 0, resolve, reject });
    });

    if (this.queue.length >= this.options.batchSize) {
      void this.processQueue();
    }

    return delivery;
  }

  async processQueue(processOptions: ProcessQueueOptions = {}): Promise<void> {
    if (this.activeProcess) {
      await this.activeProcess;
      return;
    }
    if (this.queue.length === 0) return;
    if (!processOptions.ignoreBackoff && Date.now() < this.nextAttemptAt) return;

    this.activeProcess = this.runBatch();
    try {
      await this.activeProcess;
    } finally {
      this.activeProcess = null;
    }
  }

  private async runBatch(): Promise<void> {
    this.processing = true;
    const entries = this.queue.splice(0, this.options.batchSize);

    try {
      await this.options.processBatch(entries.map(entry => entry.value));
      this.nextAttemptAt = 0;
      for (const entry of entries) entry.resolve();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const retryEntries: QueueEntry<T>[] = [];

      for (const entry of entries) {
        entry.attempts += 1;
        if (entry.attempts < this.maxAttempts) {
          retryEntries.push(entry);
        } else {
          entry.reject(error);
        }
      }

      if (retryEntries.length > 0) {
        this.queue.unshift(...retryEntries);
        const attempt = Math.max(...retryEntries.map(entry => entry.attempts));
        this.nextAttemptAt = Date.now() + Math.min(100 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
      }

      this.logger.error(
        {
          err: error,
          batchSize: entries.length,
          requeued: retryEntries.length,
        },
        "Failed to persist ingestion batch"
      );
    } finally {
      this.processing = false;
    }
  }

  /** Stop the timer and synchronously exhaust pending batches before shutdown. */
  async close(): Promise<void> {
    if (this.closing) {
      if (this.activeProcess) await this.activeProcess;
      return;
    }

    this.closing = true;
    clearInterval(this.intervalHandle);

    if (this.activeProcess) await this.activeProcess;
    while (this.queue.length > 0) {
      await this.processQueue({ ignoreBackoff: true });
    }
  }
}
