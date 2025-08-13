import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { gunzipSync } from "zlib";
import { compress as zstdCompress, decompress as zstdDecompress } from "@mongodb-js/zstd";
import { IS_CLOUD } from "../../lib/const.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

class R2StorageService {
  private client: S3Client | null = null;
  private bucketName: string = "";
  private enabled: boolean = false;
  private logger = createServiceLogger("r2-storage");

  constructor() {
    // Only initialize R2 in cloud environment
    if (IS_CLOUD && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
        // Required for R2 compatibility
        forcePathStyle: true,
      });
      this.bucketName = process.env.R2_BUCKET_NAME || "rybbit";
      this.enabled = true;
      this.logger.info({ bucket: this.bucketName }, "R2Storage initialized");
    } else {
      this.logger.debug("R2Storage not enabled - missing IS_CLOUD or R2 credentials");
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Store a batch of event data in R2
   * Returns the storage key if successful, null if R2 is disabled
   */
  async storeBatch(siteId: number, sessionId: string, eventDataArray: any[]): Promise<string | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    const timestamp = Date.now();
    const key = `${siteId}/${sessionId}/${timestamp}.json.zst`;

    try {
      // Compress with zstd - much faster decompression than brotli
      const jsonBuffer = Buffer.from(JSON.stringify(eventDataArray));
      const compressed = await zstdCompress(jsonBuffer, 3); // level 3 = good balance

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: compressed,
          ContentType: "application/json",
          ContentEncoding: "zstd",
          Metadata: {
            siteId: siteId.toString(),
            sessionId: sessionId,
            eventCount: eventDataArray.length.toString(),
            compression: "zstd",
          },
        }),
      );

      return key;
    } catch (error) {
      console.error("[R2Storage] Failed to store batch:", error);
      throw error;
    }
  }

  /**
   * Retrieve a batch of event data from R2
   * Returns the decompressed event data array
   */
  async getBatch(key: string): Promise<any[]> {
    if (!this.enabled || !this.client) {
      throw new Error("R2 storage is not enabled");
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error("Empty response body");
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      // Detect compression based on file extension
      let decompressed: Buffer;
      if (key.endsWith(".zst")) {
        decompressed = await zstdDecompress(buffer);
      } else if (key.endsWith(".gz")) {
        decompressed = gunzipSync(buffer);
      } else {
        // Assume zstd for unknown extensions
        decompressed = await zstdDecompress(buffer);
      }

      return JSON.parse(decompressed.toString());
    } catch (error) {
      console.error("[R2Storage] Failed to retrieve batch:", error);
      throw error;
    }
  }

  /**
   * Delete a batch from R2 (for cleanup)
   */
  async deleteBatch(key: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      console.error("[R2Storage] Failed to delete batch:", error);
      // Non-critical error, log but don't throw
    }
  }
}

// Singleton instance
export const r2Storage = new R2StorageService();
