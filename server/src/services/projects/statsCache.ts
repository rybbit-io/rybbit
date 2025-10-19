import NodeCache from "node-cache";

type CacheNamespace = "overview" | "pages";

const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
});

function serializeKey(namespace: CacheNamespace, projectId: string, identifier: string): string {
  return `${namespace}::${projectId}::${identifier}`;
}

export function getCachedValue<T>(namespace: CacheNamespace, projectId: string, identifier: string): T | undefined {
  return cache.get<T>(serializeKey(namespace, projectId, identifier));
}

export function setCachedValue<T>(namespace: CacheNamespace, projectId: string, identifier: string, value: T): void {
  cache.set(serializeKey(namespace, projectId, identifier), value);
}

export function invalidateProjectCache(projectId: string): void {
  const keys = cache.keys();
  for (const key of keys) {
    if (key.split("::")[1] === projectId) {
      cache.del(key);
    }
  }
}
