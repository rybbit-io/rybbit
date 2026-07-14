import { describe, expect, it, vi } from "vitest";
import { QueueFullError, ReliableBatchQueue } from "./reliableBatchQueue.js";

function createQueue(processBatch: (batch: number[]) => Promise<void>, maxQueueSize = 10) {
  return new ReliableBatchQueue<number>({
    name: "test-ingestion-queue",
    batchSize: 10,
    flushIntervalMs: 60_000,
    maxQueueSize,
    processBatch,
  });
}

describe("ReliableBatchQueue", () => {
  it("rejects the caller instead of acknowledging after retries are exhausted", async () => {
    const processBatch = vi.fn().mockRejectedValue(new Error("storage unavailable"));
    const queue = createQueue(processBatch);
    const delivery = queue.add(1);
    const rejection = expect(delivery).rejects.toThrow("storage unavailable");

    await queue.processQueue({ ignoreBackoff: true });
    await queue.processQueue({ ignoreBackoff: true });
    await queue.processQueue({ ignoreBackoff: true });

    await rejection;
    expect(processBatch).toHaveBeenCalledTimes(3);
    await queue.close();
  });

  it("drains pending deliveries during graceful shutdown", async () => {
    const processBatch = vi.fn().mockResolvedValue(undefined);
    const queue = createQueue(processBatch);
    const delivery = queue.add(1);

    await queue.close();

    await expect(delivery).resolves.toBeUndefined();
    expect(processBatch).toHaveBeenCalledWith([1]);
  });

  it("applies bounded backpressure", async () => {
    const processBatch = vi.fn().mockResolvedValue(undefined);
    const queue = createQueue(processBatch, 1);
    const firstDelivery = queue.add(1);

    await expect(queue.add(2)).rejects.toBeInstanceOf(QueueFullError);
    await queue.close();
    await expect(firstDelivery).resolves.toBeUndefined();
  });
});
