import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db/clickhouse/clickhouse.js", () => ({
  clickhouse: { query: vi.fn() },
}));
vi.mock("../../../db/postgres/postgres.js", () => ({
  db: {},
}));

import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import {
  AnalyticsQueryError,
  analyticsRoute,
  getPaginationStatements,
  runAnalyticsQuery,
  runPaginatedQuery,
} from "./analyticsQuery.js";

const mockQuery = vi.mocked(clickhouse.query);

const resultSet = (rows: unknown[]) => ({ json: async () => rows }) as any;
const requestLog = {
  debug: vi.fn(),
  error: vi.fn(),
};

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.send = vi.fn(() => res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPaginationStatements", () => {
  it("falls back to the default limit", () => {
    expect(getPaginationStatements({}, 100)).toEqual({ limitStatement: "LIMIT 100", offsetStatement: "" });
  });

  it("uses a valid explicit limit, numeric or string", () => {
    expect(getPaginationStatements({ limit: 25 }, 100).limitStatement).toBe("LIMIT 25");
    expect(getPaginationStatements({ limit: "25" }, 100).limitStatement).toBe("LIMIT 25");
  });

  it("rejects invalid limits", () => {
    expect(getPaginationStatements({ limit: "abc" }, 100).limitStatement).toBe("LIMIT 100");
    expect(getPaginationStatements({ limit: -5 }, 100).limitStatement).toBe("LIMIT 100");
    expect(getPaginationStatements({ limit: 0 }, 100).limitStatement).toBe("LIMIT 100");
  });

  it("computes the offset from page and limit", () => {
    expect(getPaginationStatements({ limit: 25, page: 3 }, 100).offsetStatement).toBe("OFFSET 50");
    expect(getPaginationStatements({ page: 2 }, 10).offsetStatement).toBe("OFFSET 10");
  });

  it("emits no OFFSET for page 1 or invalid pages", () => {
    expect(getPaginationStatements({ page: 1 }, 100).offsetStatement).toBe("");
    expect(getPaginationStatements({ page: 0 }, 100).offsetStatement).toBe("");
    expect(getPaginationStatements({ page: "abc" }, 100).offsetStatement).toBe("");
  });

  it("emits no clauses for count queries", () => {
    expect(getPaginationStatements({ limit: 25, page: 3 }, 100, true)).toEqual({
      limitStatement: "",
      offsetStatement: "",
    });
  });
});

describe("runAnalyticsQuery", () => {
  it("executes the spec and coerces numeric strings", async () => {
    mockQuery.mockResolvedValueOnce(resultSet([{ value: "Chrome", count: "42" }]));

    const rows = await runAnalyticsQuery<{ value: string; count: number }>({
      query: "SELECT 1",
      params: { siteId: 1 },
    });

    expect(mockQuery).toHaveBeenCalledWith({
      query: "SELECT 1",
      format: "JSONEachRow",
      query_params: { siteId: 1 },
    });
    expect(rows).toEqual([{ value: "Chrome", count: 42 }]);
  });

  it("wraps failures in AnalyticsQueryError carrying the SQL", async () => {
    const boom = new Error("boom");
    mockQuery.mockRejectedValueOnce(boom);

    const promise = runAnalyticsQuery({ query: "SELECT bad" });

    await expect(promise).rejects.toBeInstanceOf(AnalyticsQueryError);
    await promise.catch((error: AnalyticsQueryError) => {
      expect(error.original).toBe(boom);
      expect(error.queries).toEqual(["SELECT bad"]);
    });
  });
});

describe("runPaginatedQuery", () => {
  it("runs data and count queries and combines them", async () => {
    mockQuery
      .mockResolvedValueOnce(resultSet([{ value: "a" }, { value: "b" }]))
      .mockResolvedValueOnce(resultSet([{ totalCount: "17" }]));

    const result = await runPaginatedQuery({ query: "SELECT data" }, { query: "SELECT count" });

    expect(result).toEqual({ data: [{ value: "a" }, { value: "b" }], totalCount: 17 });
  });

  it("defaults totalCount to 0 when the count query returns no rows", async () => {
    mockQuery.mockResolvedValueOnce(resultSet([])).mockResolvedValueOnce(resultSet([]));

    const result = await runPaginatedQuery({ query: "SELECT data" }, { query: "SELECT count" });

    expect(result).toEqual({ data: [], totalCount: 0 });
  });
});

describe("analyticsRoute", () => {
  it("passes successful responses through", async () => {
    const res = mockRes();
    const handler = analyticsRoute("things", async (_req, reply) => reply.send({ data: [1] }));

    await handler({ log: requestLog } as any, res);

    expect(res.send).toHaveBeenCalledWith({ data: [1] });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("maps errors to a 500 with the label", async () => {
    const res = mockRes();
    const handler = analyticsRoute("things", async () => {
      throw new Error("boom");
    });

    await handler({ log: requestLog } as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Failed to fetch things" });
    expect(requestLog.error).toHaveBeenCalledWith(
      { err: expect.any(Error), label: "things" },
      "Analytics query failed"
    );
  });

  it("derives the label from the request and logs failed SQL", async () => {
    const res = mockRes();
    const handler = analyticsRoute<{ Querystring: { parameter: string } }>(
      req => req.query.parameter,
      async () => {
        throw new AnalyticsQueryError(new Error("boom"), ["SELECT bad"]);
      }
    );

    await handler({ query: { parameter: "browser" }, log: requestLog } as any, res);

    expect(res.send).toHaveBeenCalledWith({ error: "Failed to fetch browser" });
    expect(requestLog.debug).toHaveBeenCalledWith({ query: "SELECT bad" }, "Failed analytics query");
  });
});
