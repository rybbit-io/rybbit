import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Readable } from "stream";
import { gunzipSync } from "zlib";
import { compress as zstdCompress, decompress as zstdDecompress } from "@mongodb-js/zstd";
import { createServiceLogger } from "../../lib/logger/logger.js";

interface S3StorageConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  forcePathStyle: boolean;
}

/**
 * Resolve object-storage settings from the environment.
 *
 * Any S3-compatible provider (AWS S3, Cloudflare R2, MinIO, ...) is configured
 * with the generic S3_* variables. For backward compatibility with existing
 * Cloudflare R2 deployments the R2_* variables are accepted as a fallback, and
 * the R2 endpoint is derived from R2_ACCOUNT_ID when S3_ENDPOINT is not set.
 *
 * Returns null when no credentials are configured, which disables storage and
 * keeps replay batches in ClickHouse.
 */
function resolveStorageConfig(): S3StorageConfig | null {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  // Prefer an explicit endpoint; otherwise derive the R2 endpoint from the
  // account id. Leaving it undefined lets the SDK target AWS S3 directly.
  let endpoint = process.env.S3_ENDPOINT;
  if (!endpoint && process.env.R2_ACCOUNT_ID) {
    endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  // Path-style addressing is required by most S3-compatible providers (and R2),
  // so it defaults to true; set S3_FORCE_PATH_STYLE=false for virtual-hosted AWS.
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE
    ? process.env.S3_FORCE_PATH_STYLE.toLowerCase() === "true"
    : true;

  return {
    endpoint,
    region: process.env.S3_REGION || "auto",
    accessKeyId,
    secretAccessKey,
    bucketName: process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || "rybbit",
    forcePathStyle,
  };
}

class S3StorageService {
  private client: S3Client | null = null;
  private bucketName: string = "";
  private enabled: boolean = false;
  private logger = createServiceLogger("s3-storage");

  constructor() {
    const config = resolveStorageConfig();

    if (!config) {
      this.logger.debug("S3Storage not enabled - missing credentials");
      return;
    }

    // The AWS SDK validates response checksums by default, but several
    // S3-compatible providers (Cloudflare R2, MinIO, ...) do not return them in
    // the expected form, which breaks reads. Strip checksum headers from
    // responses to stay compatible; this is harmless against AWS S3.
    const httpHandler = new NodeHttpHandler();
    const originalHandle = httpHandler.handle.bind(httpHandler);

    httpHandler.handle = async (request: any, options?: any) => {
      const response = await originalHandle(request, options);

      return {
        ...response,
        response: {
          ...response.response,
          headers: Object.fromEntries(
            Object.entries(response.response.headers).filter(([key]) => !key.toLowerCase().includes("checksum"))
          ),
        },
      };
    };

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
      requestHandler: httpHandler,
    });

    this.bucketName = config.bucketName;
    this.enabled = true;
    this.logger.info({ bucket: this.bucketName, endpoint: config.endpoint }, "S3Storage initialized");
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Store a batch of event data in object storage.
   * Returns the storage key if successful, null if storage is disabled.
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
          ContentType: "application/octet-stream", // Binary data, not JSON
          // Don't set ContentEncoding - that triggers automatic decompression
          Metadata: {
            siteId: siteId.toString(),
            sessionId: sessionId,
            eventCount: eventDataArray.length.toString(),
            compression: "zstd",
          },
        })
      );

      return key;
    } catch (error) {
      console.error("[S3Storage] Failed to store batch:", error);
      throw error;
    }
  }

  /**
   * Retrieve a batch of event data from object storage.
   * Returns the decompressed event data array.
   */
  async getBatch(key: string): Promise<any[]> {
    if (!this.enabled || !this.client) {
      throw new Error("S3 storage is not enabled");
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
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

      // Check if data is already JSON (uncompressed)
      // This happens when ContentEncoding was set to "zstd" and the provider auto-decompressed it
      const bufferStr = buffer.toString("utf8", 0, Math.min(buffer.length, 100));
      const isLikelyJSON = bufferStr.trimStart().startsWith("[") || bufferStr.trimStart().startsWith("{");

      if (isLikelyJSON) {
        try {
          // Try parsing as JSON first
          return JSON.parse(buffer.toString());
        } catch (e) {
          // Not valid JSON, proceed with decompression
        }
      }

      // Try to decompress based on file extension
      let decompressed: Buffer;

      try {
        if (key.endsWith(".zst")) {
          decompressed = await zstdDecompress(buffer);
        } else if (key.endsWith(".gz")) {
          decompressed = gunzipSync(buffer);
        } else {
          // Assume zstd for unknown extensions
          decompressed = await zstdDecompress(buffer);
        }
        return JSON.parse(decompressed.toString());
      } catch (decompressionError: any) {
        // If decompression fails and we haven't tried JSON yet, try it now
        if (!isLikelyJSON) {
          try {
            return JSON.parse(buffer.toString());
          } catch (jsonError) {
            // Data is truly corrupted, throw the original error
            throw decompressionError;
          }
        }
        throw decompressionError;
      }
    } catch (error) {
      console.error("[S3Storage] Failed to retrieve batch:", error);
      throw error;
    }
  }

  /**
   * Delete a batch from object storage (for cleanup).
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
        })
      );
    } catch (error) {
      console.error("[S3Storage] Failed to delete batch:", error);
      // Non-critical error, log but don't throw
    }
  }
}

// Singleton instance
export const objectStorage = new S3StorageService();
