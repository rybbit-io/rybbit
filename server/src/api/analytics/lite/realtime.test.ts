import { FilterParams, TimeBucket } from "@rybbit/shared";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  overview: vi.fn(async (_req: FastifyRequest, res: FastifyReply) => res.send({ data: { sessions: 7 } })),
  chart: vi.fn(async (_req: FastifyRequest, res: FastifyReply) => res.send({ data: [{ sessions: 7 }] })),
  metric: vi.fn(async (_req: FastifyRequest, res: FastifyReply) => res.send({ data: { data: [{ count: 7 }] } })),
  query: vi.fn(),
}));
vi.mock("../getOverview.js", () => ({ getOverview: mocks.overview }));
vi.mock("../getOverviewBucketed.js", () => ({ getOverviewBucketed: mocks.chart }));
vi.mock("../getMetric.js", () => ({ getMetric: mocks.metric }));
vi.mock("../../../db/clickhouse/clickhouse.js", () => ({ clickhouse: { query: mocks.query } }));
vi.mock("../../../db/postgres/postgres.js", () => ({ db: {} }));

import { getMetricLite } from "./getMetricLite.js";
import { getOverviewBucketedLite } from "./getOverviewBucketedLite.js";
import { getOverviewLite } from "./getOverviewLite.js";

describe("lite rolling-window routing", () => {
  it.each([
    { name: "overview", handler: getOverviewLite, raw: mocks.overview },
    { name: "chart", handler: getOverviewBucketedLite, raw: mocks.chart },
    { name: "metric", handler: getMetricLite, raw: mocks.metric },
  ])("uses exact event timestamps for the $name", async ({ handler, raw }) => {
    vi.clearAllMocks();
    const app = Fastify();
    app.get<{
      Params: { siteId: string };
      Querystring: FilterParams<{ bucket: TimeBucket; parameter: "pathname" }>;
    }>("/sites/:siteId/analytics", handler);
    try {
      for (const minutes of [5, 30, 60, 120]) {
        const response = await app.inject(
          `/sites/1/analytics?past_minutes_start=${minutes}&past_minutes_end=0&bucket=minute&parameter=pathname`
        );
        expect(response.statusCode).toBe(200);
      }
      expect(raw).toHaveBeenCalledTimes(4);
      expect(mocks.query).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
