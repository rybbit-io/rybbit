import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  process.env.R2_ACCESS_KEY_ID = "test-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.R2_ACCOUNT_ID = "test-account";
  process.env.R2_BUCKET_NAME = "test-bucket";
  return { sentCommands: [] as any[] };
});

vi.mock("../../lib/const.js", () => ({ IS_CLOUD: true }));
vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => ({ info: vi.fn(), debug: vi.fn() }),
}));
vi.mock("@smithy/node-http-handler", () => ({
  NodeHttpHandler: class {
    handle = vi.fn();
  },
}));
vi.mock("@aws-sdk/client-s3", () => {
  class Command {
    constructor(public input: any) {}
  }
  return {
    S3Client: class {
      async send(command: any) {
        mocks.sentCommands.push(command);
        return {};
      }
    },
    PutObjectCommand: Command,
    GetObjectCommand: Command,
    DeleteObjectCommand: Command,
  };
});
vi.mock("@mongodb-js/zstd", () => ({
  compress: async (buffer: Buffer) => buffer,
  decompress: async (buffer: Buffer) => buffer,
}));

import { r2Storage } from "./r2StorageService.js";

describe("R2 replay batch keys", () => {
  afterEach(() => {
    mocks.sentCommands.length = 0;
  });

  it("uses the stable batch id rather than a collision-prone millisecond timestamp", async () => {
    await r2Storage.storeBatch(42, "session-1", "batch-a", [{ batch: 1 }]);
    await r2Storage.storeBatch(42, "session-1", "batch-b", [{ batch: 2 }]);

    expect(mocks.sentCommands.map(command => command.input.Key)).toEqual([
      "42/session-1/batch-a.json.zst",
      "42/session-1/batch-b.json.zst",
    ]);
  });
});
