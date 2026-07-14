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
    expect(processBatch).toHaveBeenCalledWith([1], { batchId: expect.any(String) });
  });

  it("applies bounded backpressure", async () => {
    const processBatch = vi.fn().mockResolvedValue(undefined);
    const queue = createQueue(processBatch, 1);
    const firstDelivery = queue.add(1);

    await expect(queue.add(2)).rejects.toBeInstanceOf(QueueFullError);
    await queue.close();
    await expect(firstDelivery).resolves.toBeUndefined();
  });

  it("retries the exact same batch with a stable insertion id", async () => {
    const calls: Array<{ batch: number[]; batchId: string | undefined }> = [];
    const processBatch = vi
      .fn()
      .mockImplementationOnce(async (batch: number[], context?: { batchId: string }) => {
        calls.push({ batch, batchId: context?.batchId });
        throw new Error("ambiguous insert result");
      })
      .mockImplementation(async (batch: number[], context?: { batchId: string }) => {
        calls.push({ batch, batchId: context?.batchId });
      });
    const queue = createQueue(processBatch);
    const firstDelivery = queue.add(1);

    await queue.processQueue({ ignoreBackoff: true });
    const secondDelivery = queue.add(2);
    await queue.processQueue({ ignoreBackoff: true });

    await expect(firstDelivery).resolves.toBeUndefined();
    expect(calls.slice(0, 2).map(call => call.batch)).toEqual([[1], [1]]);
    expect(calls[0].batchId).toBeTruthy();
    expect(calls[1].batchId).toBe(calls[0].batchId);

    await queue.processQueue({ ignoreBackoff: true });
    await expect(secondDelivery).resolves.toBeUndefined();
    await queue.close();
  });
});
