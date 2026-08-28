import { ImportQuotaTracker } from "./importQuotaTracker.js";

interface CachedTracker {
  tracker: ImportQuotaTracker;
  lastAccessed: number;
}

class ImportQuotaManager {
  private trackers = new Map<string, CachedTracker>();
  private trackerCreationLocks = new Map<string, Promise<ImportQuotaTracker>>(); // prevents duplicate tracker creation

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

  invalidateTracker(organizationId: string): void {
    this.trackers.delete(organizationId);
  }

  cleanup(): void {
    const now = Date.now();

    // Cleanup stale trackers
    for (const [orgId, cached] of this.trackers) {
      if (now - cached.lastAccessed > this.TRACKER_TTL_MS) {
        this.trackers.delete(orgId);
      }
    }
  }
}

export const importQuotaManager = new ImportQuotaManager();

const cleanupInterval = setInterval(() => importQuotaManager.cleanup(), 15 * 60 * 1000);
cleanupInterval.unref?.();
