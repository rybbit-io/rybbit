import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiV1Routes } from "./index.js";
import { projectRateLimiter } from "../../lib/projectRateLimiter.js";

const mockProject = {
  id: "proj_123",
  organizationId: "org_123",
  name: "Test Project",
  apiKeyHash: "hash",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {},
  isActive: true,
};

const {
  ingestEventsMock,
  listEventsMock,
  createFunnelMock,
  listFunnelsMock,
  getFunnelMock,
  updateFunnelMock,
  deleteFunnelMock,
  getFunnelStatsMock,
  getOverviewStatsMock,
  getPageStatsMock,
  getRealtimeStatsMock,
  getEventSummaryMock,
  getEventDailySeriesMock,
  listUsersMock,
  countUsersMock,
} = vi.hoisted(() => ({
  ingestEventsMock: vi.fn(),
  listEventsMock: vi.fn(),
  createFunnelMock: vi.fn(),
  listFunnelsMock: vi.fn(),
  getFunnelMock: vi.fn(),
  updateFunnelMock: vi.fn(),
  deleteFunnelMock: vi.fn(),
  getFunnelStatsMock: vi.fn(),
  getOverviewStatsMock: vi.fn(),
  getPageStatsMock: vi.fn(),
  getRealtimeStatsMock: vi.fn(),
  getEventSummaryMock: vi.fn(),
  getEventDailySeriesMock: vi.fn(),
  listUsersMock: vi.fn(),
  countUsersMock: vi.fn(),
}));

vi.mock("../../services/projects/eventService.js", () => ({
  ingestEvents: ingestEventsMock,
  listEvents: listEventsMock,
}));

vi.mock("../../services/projects/funnelService.js", () => ({
  createFunnel: createFunnelMock,
  listFunnels: listFunnelsMock,
  getFunnel: getFunnelMock,
  updateFunnel: updateFunnelMock,
  deleteFunnel: deleteFunnelMock,
  getFunnelStats: getFunnelStatsMock,
}));

vi.mock("../../services/projects/statsService.js", () => ({
  getOverviewStats: getOverviewStatsMock,
  getPageStats: getPageStatsMock,
  getRealtimeStats: getRealtimeStatsMock,
}));

vi.mock("../../services/projects/eventStatsService.js", () => ({
  getEventSummary: getEventSummaryMock,
  getEventDailySeries: getEventDailySeriesMock,
}));

vi.mock("../../services/projects/userService.js", () => ({
  listUsers: listUsersMock,
  countUsers: countUsersMock,
}));

const { getProjectByApiKeyMock } = vi.hoisted(() => ({
  getProjectByApiKeyMock: vi.fn(),
}));

vi.mock("../../services/projects/projectService.js", () => ({
  getProjectByApiKey: getProjectByApiKeyMock,
}));

async function buildServer() {
  const server = Fastify({ logger: false });
  await server.register(apiV1Routes, { prefix: "/api/v1" });
  await server.ready();
  return server;
}

beforeEach(() => {
  vi.clearAllMocks();

  ingestEventsMock.mockResolvedValue({ accepted: 1, total: 1, skipped: 0, errors: [] });
  listEventsMock.mockResolvedValue([
    {
      id: "evt_1",
      occurredAt: "2024-12-01T10:00:00.000Z",
      pageUrl: "https://example.com",
      path: "/",
      referrer: "https://referrer.com",
      funnelId: "fun_1",
      stepKey: "visit",
      metadata: { source: "test" },
    },
  ]);

  const funnel = {
    id: "fun_1",
    projectId: mockProject.id,
    name: "Signup",
    description: null,
    isActive: true,
    createdAt: "2024-12-01T10:00:00.000Z",
    updatedAt: "2024-12-01T10:00:00.000Z",
    steps: [
      { id: "step_1", key: "visit", name: "Visit", order: 0, pagePattern: "/" },
      { id: "step_2", key: "signup", name: "Signup", order: 1, pagePattern: "/signup" },
    ],
  };

  createFunnelMock.mockResolvedValue(funnel);
  listFunnelsMock.mockResolvedValue([funnel]);
  getFunnelMock.mockResolvedValue(funnel);
  updateFunnelMock.mockResolvedValue(funnel);
  deleteFunnelMock.mockResolvedValue(true);
  getFunnelStatsMock.mockResolvedValue({
    funnelId: funnel.id,
    totalVisitors: 10,
    steps: [
      { stepKey: "visit", name: "Visit", visits: 10, conversions: 6, dropOff: 4, conversionRate: 60, order: 0 },
      { stepKey: "signup", name: "Signup", visits: 6, conversions: 6, dropOff: 0, conversionRate: 100, order: 1 },
    ],
  });

  getOverviewStatsMock.mockResolvedValue([
    {
      period: "2024-12-01T00:00:00.000Z",
      visits: 42,
      uniqueVisitors: 30,
    },
  ]);

  getPageStatsMock.mockResolvedValue([
    {
      path: "/",
      pageUrl: "https://example.com",
      visits: 12,
      uniqueVisitors: 8,
      firstSeen: "2024-12-01T00:00:00.000Z",
      lastSeen: "2024-12-02T00:00:00.000Z",
    },
  ]);

  getRealtimeStatsMock.mockResolvedValue({
    activeVisitors: 5,
    activeSessions: 3,
    topPages: [{ path: "/", pageUrl: "https://example.com", visits: 10 }],
    updatedAt: "2024-12-01T10:00:00.000Z",
  });

  getEventSummaryMock.mockResolvedValue({
    totalEvents: 123,
    uniqueVisitors: 45,
    uniqueSessions: 30,
    firstSeen: "2024-12-01T00:00:00.000Z",
    lastSeen: "2024-12-02T00:00:00.000Z",
  });

  getEventDailySeriesMock.mockResolvedValue([
    { date: "2024-12-01T00:00:00.000Z", events: 100, uniqueVisitors: 40 },
  ]);

  listUsersMock.mockResolvedValue([
    {
      visitorId: "visitor-1",
      visits: 12,
      sessions: 3,
      firstSeen: "2024-11-30T10:00:00.000Z",
      lastSeen: "2024-12-01T10:00:00.000Z",
    },
  ]);
  countUsersMock.mockResolvedValue(1);

  getProjectByApiKeyMock.mockImplementation(async key => (key === "valid-key" ? mockProject : null));

  vi.spyOn(projectRateLimiter, "isAllowed").mockReturnValue(true);
  vi.spyOn(projectRateLimiter, "getResetTime").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API v1 integration", () => {
  const baseEvent = {
    timestamp: "2024-12-01T10:00:00.000Z",
    session_id: "sess_123",
  };

  it("rejects requests without API key", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/events",
        payload: baseEvent,
      });
      expect(response.statusCode).toBe(401);
      expect(ingestEventsMock).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("accepts event ingestion", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/events",
        headers: { "x-api-key": "valid-key" },
        payload: baseEvent,
      });
      expect(response.statusCode).toBe(202);
      expect(ingestEventsMock).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });

  it("handles batch ingestion of 100 events", async () => {
    const server = await buildServer();
    const baseTime = new Date("2024-12-01T10:00:00.000Z").getTime();
    const batch = Array.from({ length: 100 }, (_, index) => ({
      timestamp: new Date(baseTime + index * 1000).toISOString(),
      session_id: `sess_${index}`,
    }));
    ingestEventsMock.mockResolvedValueOnce({ accepted: 100, total: 100, skipped: 0, errors: [] });

    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/events",
        headers: { "x-api-key": "valid-key" },
        payload: batch,
      });
      expect(response.statusCode).toBe(202);
      expect(ingestEventsMock).toHaveBeenCalledOnce();
      const [, eventsArg] = ingestEventsMock.mock.calls[0];
      expect(eventsArg).toHaveLength(100);
    } finally {
      await server.close();
    }
  });

  it("lists events", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/events",
        headers: { "x-api-key": "valid-key" },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(1);
      expect(listEventsMock).toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("creates a funnel", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/funnels",
        headers: { "x-api-key": "valid-key" },
        payload: {
          name: "Signup",
          steps: [
            { key: "visit", name: "Visit" },
            { key: "signup", name: "Signup" },
          ],
        },
      });
      expect(response.statusCode).toBe(201);
      expect(createFunnelMock).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });

  it("fetches overview stats", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stats/overview",
        headers: { "x-api-key": "valid-key" },
      });
      expect(response.statusCode).toBe(200);
      expect(getOverviewStatsMock).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });

  it("returns realtime stats snapshot", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stats/realtime",
        headers: { "x-api-key": "valid-key" },
      });
      expect(response.statusCode).toBe(200);
      expect(getRealtimeStatsMock).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });

  it("returns event summary stats", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/events/stats/summary",
        headers: { "x-api-key": "valid-key" },
      });
      expect(response.statusCode).toBe(200);
      expect(getEventSummaryMock).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });

  it("returns event daily series", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/events/stats/daily",
        headers: { "x-api-key": "valid-key" },
      });
      expect(response.statusCode).toBe(200);
      expect(getEventDailySeriesMock).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });

  it("lists project users", async () => {
    const server = await buildServer();
    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/users",
        headers: { "x-api-key": "valid-key" },
      });
      expect(response.statusCode).toBe(200);
      expect(listUsersMock).toHaveBeenCalledOnce();
      expect(countUsersMock).toHaveBeenCalledOnce();
    } finally {
      await server.close();
    }
  });
});
