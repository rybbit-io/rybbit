import { ImportQuotaTracker } from "./importQuotaTracker.js";
import { IS_CLOUD } from "../../lib/const.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { importLockAcquire, importLockRelease } from "../../db/redis/redis.js";
import { getImportById } from "./importStatusManager.js";

// How long an import may run before it no longer counts as active. Imports are only marked
// complete by the client's final batch, so this is also when one whose client stopped early
// (tab closed, network lost) is treated as abandoned and can be deleted.
export const IMPORT_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

const logger = createServiceLogger("import-quota");

interface CachedTracker {
  tracker: ImportQuotaTracker;
  createdAt: number;
}

interface LocalLock {
  owner: string;
  startedAt: number;
  // False for a lock taken while Redis was down: Redis never saw it, so only this record
  // keeps a second import out once Redis is back.
  inRedis: boolean;
}

const lockKey = (organizationId: string) => `import:lock:${organizationId}`;

// The lock is taken before the import row is written, so a missing row only means the import
// is gone (deleted) once the lock is older than this.
const MISSING_ROW_GRACE_MS = 60 * 1000;

/**
 * One import at a time per organization, and the trackers that enforce its monthly quota.
 *
 * The lock lives in Redis so every cluster worker sees it: the batches and the delete for an
 * import can land on any worker, not just the one that started it. It belongs to the import's
 * id, so finishing or deleting some other import never releases it, and it expires after
 * IMPORT_TIMEOUT_MS like an abandoned import does. If Redis is unavailable the lock falls back
 * to this process, as it worked before, so imports are never refused because of Redis.
 *
 * Every lock this process takes is also recorded locally, so switching between Redis and the
 * fallback never lets a second import past one this process already started.
 */
class ImportQuotaManager {
  private trackers = new Map<string, CachedTracker>();
  private localLocks = new Map<string, LocalLock>();
  private trackerCreationLocks = new Map<string, Promise<ImportQuotaTracker>>(); // prevents duplicate tracker creation

  // Not sliding: the tracker's ClickHouse baseline must stay younger than the Redis quota
  // counts it seeds (IMPORT_QUOTA_TTL_MS), or an expired count could be reseeded from usage
  // read before events this organization has since imported.
  private readonly TRACKER_TTL_MS = 30 * 60 * 1000; // 30 minutes

  async getTracker(organizationId: string): Promise<ImportQuotaTracker> {
    const now = Date.now();
    const cached = this.trackers.get(organizationId);

    if (cached && now - cached.createdAt < this.TRACKER_TTL_MS) {
      return cached.tracker;
    }

    // Check if tracker is currently being created
    const existingCreation = this.trackerCreationLocks.get(organizationId);
    if (existingCreation) {
      return await existingCreation;
    }

    // Create lock for this organization's tracker creation
    const creationPromise = (async () => {
      try {
        const tracker = await ImportQuotaTracker.create(organizationId);
        this.trackers.set(organizationId, { tracker, createdAt: now });
        return tracker;
      } finally {
        this.trackerCreationLocks.delete(organizationId);
      }
    })();

    this.trackerCreationLocks.set(organizationId, creationPromise);
    return await creationPromise;
  }

  private liveLocalLock(organizationId: string): LocalLock | undefined {
    const local = this.localLocks.get(organizationId);
    return local && Date.now() - local.startedAt < IMPORT_TIMEOUT_MS ? local : undefined;
  }

  // A local record may outlive its import: the final batch or the delete can land on another
  // worker, which can only clear its own record. The import row says whether it is still
  // running. If the lookup fails the record keeps holding, which errs on the side of refusing.
  private async heldLocalLock(organizationId: string): Promise<LocalLock | undefined> {
    const local = this.liveLocalLock(organizationId);
    if (!local) return undefined;
    try {
      const row = await getImportById(local.owner);
      const finished = row ? row.completedAt !== null : Date.now() - local.startedAt > MISSING_ROW_GRACE_MS;
      if (finished) {
        if (this.localLocks.get(organizationId) === local) this.localLocks.delete(organizationId);
        return undefined;
      }
    } catch (error) {
      logger.warn({ err: error, organizationId }, "Could not check the import holding the local lock");
    }
    return local;
  }

  /**
   * Takes the organization's import lock for `importId`, generated before the import row so the
   * lock has one owner throughout. Returns false while another import is active.
   */
  async startImport(organizationId: string, importId: string): Promise<boolean> {
    if (!IS_CLOUD) return true;

    // Taken while Redis was down, so Redis can't refuse on its behalf.
    if (this.liveLocalLock(organizationId)?.inRedis === false && (await this.heldLocalLock(organizationId))) {
      return false;
    }

    let acquired: boolean;
    try {
      acquired = await importLockAcquire(lockKey(organizationId), importId, IMPORT_TIMEOUT_MS);
    } catch (error) {
      logger.warn({ err: error, organizationId }, "Import lock Redis call failed; locking in this process only");
      // Redis's locks can't be seen now, but this process's own still count, including ones
      // taken through Redis. Re-read after the lookup so concurrent starts can't both pass.
      if (await this.heldLocalLock(organizationId)) return false;
      if (this.liveLocalLock(organizationId)) return false;
      this.localLocks.set(organizationId, { owner: importId, startedAt: Date.now(), inRedis: false });
      return true;
    }

    // Redis decides while it's up: a local record it no longer holds was released by whichever
    // worker finished that import.
    if (acquired) this.localLocks.set(organizationId, { owner: importId, startedAt: Date.now(), inRedis: true });
    return acquired;
  }

  /** Releases the organization's import lock, in Redis and here, if `importId` still holds it. Never throws. */
  async completeImport(organizationId: string, importId: string): Promise<void> {
    if (!IS_CLOUD) return;

    if (this.localLocks.get(organizationId)?.owner === importId) {
      this.localLocks.delete(organizationId);
    }

    try {
      await importLockRelease(lockKey(organizationId), importId);
    } catch (error) {
      logger.warn({ err: error, organizationId }, "Could not release the import lock; it expires on its own");
    }
  }

  cleanup(): void {
    const now = Date.now();

    // Cleanup stale trackers
    for (const [orgId, cached] of this.trackers) {
      if (now - cached.createdAt > this.TRACKER_TTL_MS) {
        this.trackers.delete(orgId);
      }
    }

    // Cleanup timed-out local lock records
    for (const [orgId, lock] of this.localLocks) {
      if (now - lock.startedAt > IMPORT_TIMEOUT_MS) {
        this.localLocks.delete(orgId);
      }
    }
  }
}

export const importQuotaManager = new ImportQuotaManager();

// Background cleanup loop. Trackers and fallback locks live in whichever process serves
// imports, which is every cluster worker, so each process cleans up its own.
if (IS_CLOUD) {
  setInterval(() => importQuotaManager.cleanup(), 15 * 60 * 1000).unref();
}
