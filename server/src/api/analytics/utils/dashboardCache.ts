import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  FastifyRequest,
  onResponseHookHandler,
  onSendHookHandler,
  preHandlerHookHandler,
  RouteShorthandOptions,
} from "fastify";
import { Redis } from "ioredis";

export interface DashboardCacheOptions {
  redis: Pick<Redis, "eval" | "status">;
  namespace: string;
  ttlMs?: number;
  lockMs?: number;
  maxResponseBytes?: number;
}

// The read/claim and publish/release operations are atomic across backend
// workers. An expired owner must never overwrite a newer owner's response.
const READ_OR_CLAIM = `
  if ARGV[3] ~= '' then
    local completed = redis.call('GET', KEYS[3])
    if completed then return {'completed', completed} end
  end
  local value = redis.call('GET', KEYS[1])
  if value then return {'hit', value} end
  if redis.call('SET', KEYS[2], ARGV[1], 'NX', 'PX', ARGV[2]) then return {'owner'} end
  return {'wait', redis.call('GET', KEYS[2])}
`;
const PUBLISH = `
  if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
  if tonumber(ARGV[3]) > 0 then redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3]) end
  redis.call('SET', KEYS[3], ARGV[4], 'PX', 5000)
  redis.call('DEL', KEYS[2])
  return 1
`;
const RELEASE = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
  return 0
`;
const RENEW = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
  return 0
`;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)])
    );
  }
  return value;
}

const hooks = <T>(hook: T | T[] | undefined): T[] => (hook === undefined ? [] : Array.isArray(hook) ? hook : [hook]);

export function createDashboardCache({
  redis,
  namespace,
  ttlMs = 30_000,
  lockMs = 5_000,
  maxResponseBytes = 256 * 1024,
}: DashboardCacheOptions) {
  const owners = new WeakMap<
    FastifyRequest,
    { key: string; lock: string; token: string; startedAt: number; heartbeat: NodeJS.Timeout }
  >();

  const release: onResponseHookHandler = async request => {
    const owner = owners.get(request);
    if (!owner) return;
    clearInterval(owner.heartbeat);
    owners.delete(request);
    try {
      await redis.eval(RELEASE, 1, owner.lock, owner.token);
    } catch {
      // The lease expires even if Redis is unavailable during cleanup.
    }
  };

  const read: preHandlerHookHandler = async (request, reply) => {
    // This hook is appended AFTER access checks, time validation and segment
    // expansion. Cache identity uses the resolved Site and full expanded query.
    if (
      ttlMs <= 0 ||
      request.method !== "GET" ||
      redis.status !== "ready" ||
      /(?:no-cache|no-store|max-age=0)/i.test(String(request.headers["cache-control"] || ""))
    )
      return;

    const digest = createHash("sha256")
      .update(
        JSON.stringify(
          canonical({
            route: request.routeOptions.url,
            params: request.params,
            query: request.query,
          })
        )
      )
      .digest("hex");
    const key = `dashboard:v1:{${namespace}:${digest}}`;
    const lock = `${key}:lock`;
    const token = randomUUID();
    const deadline = Date.now() + 70_000;
    let waited = false;
    let waitingFor = "";

    try {
      while (!reply.raw.destroyed && !request.raw.aborted && Date.now() < deadline) {
        const [result, payload] = (await redis.eval(
          READ_OR_CLAIM,
          3,
          key,
          lock,
          `${key}:done:${waitingFor}`,
          token,
          lockMs,
          waitingFor
        )) as string[];
        if (result === "completed") {
          const completion = JSON.parse(payload);
          if (completion.retry) return;
          reply.header("X-Rybbit-Cache", "COALESCED");
          return reply.code(completion.status).type(completion.type).send(completion.payload);
        }
        if (result === "hit") {
          reply.header("X-Rybbit-Cache", waited ? "COALESCED" : "HIT");
          return reply.type("application/json; charset=utf-8").send(payload);
        }
        if (result === "owner") {
          // A live slow query renews its short lease. A crashed worker leaves
          // followers waiting at most one lease, rather than the query timeout.
          let renewing = false;
          const heartbeat = setInterval(
            async () => {
              if (renewing) return;
              renewing = true;
              try {
                if (reply.raw.destroyed || request.raw.aborted || !(await redis.eval(RENEW, 1, lock, token, lockMs)))
                  clearInterval(heartbeat);
              } catch {
                // An unavailable Redis cannot prevent the original query from
                // completing. Publication still verifies ownership afterwards.
              } finally {
                renewing = false;
              }
            },
            Math.max(10, Math.floor(lockMs / 3))
          );
          heartbeat.unref();
          owners.set(request, { key, lock, token, startedAt: Date.now(), heartbeat });
          reply.header("X-Rybbit-Cache", "MISS");
          return;
        }
        waited = true;
        waitingFor = payload;
        await delay(50);
      }
    } catch (error) {
      request.log.debug({ err: error }, "Dashboard cache unavailable; querying directly");
    }
    // Cache availability never decides whether analytics can be served.
  };

  const write: onSendHookHandler = async (request, reply, payload) => {
    const owner = owners.get(request);
    if (!owner) return payload;
    clearInterval(owner.heartbeat);
    // Count freshness from query start, not completion: a slow query must not
    // add its execution time on top of the promised cache lifetime.
    const remaining = owner.startedAt + ttlMs - Date.now();
    const type = String(reply.getHeader("content-type") || "");
    const shareable =
      type.startsWith("application/json") &&
      typeof payload === "string" &&
      Buffer.byteLength(payload) <= maxResponseBytes;
    const cacheTtl = shareable && reply.statusCode === 200 ? Math.max(Math.floor(remaining), 0) : 0;
    // Only callers already waiting for this owner's token can receive an error
    // completion. New requests retry normally; failures never enter the cache.
    const completion = JSON.stringify(shareable ? { status: reply.statusCode, type, payload } : { retry: true });
    try {
      await redis.eval(
        PUBLISH,
        3,
        owner.key,
        owner.lock,
        `${owner.key}:done:${owner.token}`,
        owner.token,
        typeof payload === "string" ? payload : "",
        cacheTtl,
        completion
      );
      owners.delete(request);
    } catch (error) {
      request.log.debug({ err: error }, "Could not cache dashboard response");
    }
    return payload;
  };

  return <T extends RouteShorthandOptions>(options: T): T => ({
    ...options,
    preHandler: [...hooks(options.preHandler), read],
    onSend: [...hooks(options.onSend), write],
    onResponse: [...hooks(options.onResponse), release],
  });
}
