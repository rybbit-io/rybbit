import cluster from "node:cluster";
import { ImportQuotaTracker } from "./importQuotaTracker.js";
import { IS_CLOUD } from "../../lib/const.js";

// How long an import may run before it no longer counts as active. Imports are only marked
// complete by the client's final batch, so this is also when one whose client stopped early
// (tab closed, network lost) is treated as abandoned and can be deleted.
export const IMPORT_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CachedTracker {
  tracker: ImportQuotaTracker;
  lastAccessed: number;
}

class ImportQuotaManager {
  private trackers = new Map<string, CachedTracker>();
  private activeImports = new Map<string, number>(); // stores startedAt timestamp
  private trackerCreationLocks = new Map<string, Promise<ImportQuotaTracker>>(); // prevents duplicate tracker creation

  private readonly CONCURRENT_IMPORT_LIMIT = 1;
  private readonly TRACKER_TTL_MS = 30 * 60 * 1000; // 30 minutes

  async getTracker(organizationId: string): Promise<ImportQuotaTracker> {
    const now = Date.now();
    const cached = this.trackers.get(organizationId);

    if (cached && now - cached.lastAccessed < this.TRACKER_TTL_MS) {
      cached.lastAccessed = now;
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
        this.trackers.set(organizationId, { tracker, lastAccessed: now });
        return tracker;
      } finally {
        this.trackerCreationLocks.delete(organizationId);
      }
    })();

    this.trackerCreationLocks.set(organizationId, creationPromise);
    return await creationPromise;
  }

  startImport(organizationId: string): boolean {
    if (!IS_CLOUD) return true;

    const now = Date.now();
    const startedAt = this.activeImports.get(organizationId);

    // If an import exists and hasn't timed out, limit reached
    if (startedAt && now - startedAt < IMPORT_TIMEOUT_MS && this.CONCURRENT_IMPORT_LIMIT === 1) {
      return false;
    }

    // Otherwise start a new import
    this.activeImports.set(organizationId, now);
    return true;
  }

  completeImport(organizationId: string): void {
    this.activeImports.delete(organizationId);
  }

  cleanup(): void {
    const now = Date.now();

    // Cleanup stale trackers
    for (const [orgId, cached] of this.trackers) {
      if (now - cached.lastAccessed > this.TRACKER_TTL_MS) {
        this.trackers.delete(orgId);
      }
    }

    // Cleanup timed-out imports
    for (const [orgId, startedAt] of this.activeImports) {
      if (now - startedAt > IMPORT_TIMEOUT_MS) {
        this.activeImports.delete(orgId);
      }
    }
  }
}

export const importQuotaManager = new ImportQuotaManager();

// Background cleanup loop
if (IS_CLOUD && !cluster.isWorker) {
  setInterval(() => importQuotaManager.cleanup(), 15 * 60 * 1000);
}
