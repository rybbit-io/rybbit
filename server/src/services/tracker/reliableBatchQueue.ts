import { randomUUID } from "node:crypto";
import { createServiceLogger } from "../../lib/logger/logger.js";

type QueueEntry<T> = {
  value: T;
  resolve: () => void;
  reject: (error: Error) => void;
};

type PendingBatch<T> = {
  batchId: string;
  entries: QueueEntry<T>[];
  attempts: number;
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
  processBatch: (batch: T[], context: ReliableBatchContext) => Promise<void>;
};

export type ReliableBatchContext = {
  batchId: string;
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
  private retryBatch: PendingBatch<T> | null = null;
  private activeBatch: PendingBatch<T> | null = null;
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
    if (this.pendingSize() >= this.maxQueueSize) {
      return Promise.reject(new QueueFullError(this.options.name, this.maxQueueSize));
    }

    const delivery = new Promise<void>((resolve, reject) => {
      this.queue.push({ value, resolve, reject });
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
    if (!this.hasPendingBatch()) return;
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
    const batch =
      this.retryBatch ??
      ({
        batchId: randomUUID(),
        entries: this.queue.splice(0, this.options.batchSize),
        attempts: 0,
      } satisfies PendingBatch<T>);
    this.retryBatch = null;
    this.activeBatch = batch;

    try {
      await this.options.processBatch(
        batch.entries.map(entry => entry.value),
        { batchId: batch.batchId }
      );
      this.nextAttemptAt = 0;
      for (const entry of batch.entries) entry.resolve();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      batch.attempts += 1;

      if (batch.attempts < this.maxAttempts) {
        this.retryBatch = batch;
        this.nextAttemptAt = Date.now() + Math.min(100 * 2 ** (batch.attempts - 1), MAX_RETRY_DELAY_MS);
      } else {
        this.nextAttemptAt = 0;
        for (const entry of batch.entries) entry.reject(error);
      }

      this.logger.error(
        {
          err: error,
          batchId: batch.batchId,
          batchSize: batch.entries.length,
          requeued: this.retryBatch ? batch.entries.length : 0,
        },
        "Failed to persist ingestion batch"
      );
    } finally {
      this.activeBatch = null;
      this.processing = false;
    }
  }

  private hasPendingBatch(): boolean {
    return this.retryBatch !== null || this.queue.length > 0;
  }

  private pendingSize(): number {
    return this.queue.length + (this.retryBatch?.entries.length ?? 0) + (this.activeBatch?.entries.length ?? 0);
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
    while (this.hasPendingBatch()) {
      await this.processQueue({ ignoreBackoff: true });
    }
  }
}
