import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  existingSessionHourlyView: undefined as string | undefined,
}));

const mocks = vi.hoisted(() => ({
  exec: vi.fn(),
  query: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@clickhouse/client", () => ({
  createClient: () => ({
    exec: mocks.exec,
    query: mocks.query,
  }),
}));

vi.mock("../../lib/const.js", () => ({
  IS_CLOUD: false,
  LITE_DASHBOARD: true,
}));

vi.mock("../../lib/logger/logger.js", () => ({
  createServiceLogger: () => mocks.logger,
}));

import { initializeClickhouse } from "./clickhouse.js";

function executedQueries() {
  return mocks.exec.mock.calls.map(([args]) => args.query as string);
}

function findSessionHourlyCreateQuery() {
  return executedQueries().find(query => /CREATE MATERIALIZED VIEW session_hourly_mv\b/.test(query));
}

describe("session hourly materialized view initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.existingSessionHourlyView = undefined;
    mocks.exec.mockResolvedValue(undefined);
    mocks.query.mockImplementation(async ({ query }: { query: string }) => {
      if (query.includes("FROM system.columns")) {
        return { json: async () => [] };
      }

      if (query.includes("FROM system.tables")) {
        return {
          json: async () =>
            state.existingSessionHourlyView ? [{ create_table_query: state.existingSessionHourlyView }] : [],
        };
      }

      throw new Error(`Unexpected ClickHouse query: ${query}`);
    });
  });

  it("creates the hourly rollup from finalized sessions instead of raw events", async () => {
    await initializeClickhouse();

    const createQuery = findSessionHourlyCreateQuery();
    expect(createQuery).toBeDefined();
    expect(createQuery).toContain("REFRESH EVERY 1 HOUR");
    expect(createQuery).toContain("FROM sessions_mv_target FINAL");
    expect(createQuery).not.toMatch(/FROM events\b/);
    expect(executedQueries()).not.toContainEqual(expect.stringMatching(/DROP VIEW/));
  });

  it("replaces the old five-minute raw-events definition", async () => {
    state.existingSessionHourlyView = `
      CREATE MATERIALIZED VIEW analytics.session_hourly_mv
      REFRESH EVERY 5 MINUTE
      TO analytics.session_hourly_mv_target
      AS SELECT * FROM analytics.events
    `;

    await initializeClickhouse();

    const queries = executedQueries();
    const dropIndex = queries.findIndex(query => query.includes("DROP VIEW IF EXISTS session_hourly_mv SYNC"));
    const createIndex = queries.findIndex(query => /CREATE MATERIALIZED VIEW session_hourly_mv\b/.test(query));

    expect(dropIndex).toBeGreaterThanOrEqual(0);
    expect(createIndex).toBeGreaterThan(dropIndex);
  });

  it("leaves an already-correct definition unchanged", async () => {
    state.existingSessionHourlyView = `
      CREATE MATERIALIZED VIEW analytics.session_hourly_mv
      REFRESH EVERY 1 HOUR
      TO analytics.session_hourly_mv_target
      AS SELECT * FROM analytics.sessions_mv_target FINAL
    `;

    await initializeClickhouse();

    expect(findSessionHourlyCreateQuery()).toBeUndefined();
    expect(executedQueries()).not.toContainEqual(expect.stringMatching(/DROP VIEW/));
  });
});
