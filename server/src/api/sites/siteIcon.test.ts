import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("../../db/postgres/postgres.js", () => ({
  db: { query: { sites: { findFirst: () => findFirst() } } },
}));

const { getSiteIcon } = await import("./siteIcon.js");

const ICON = Buffer.from("fake-png-bytes");

function replyStub() {
  const headers: Record<string, string> = {};
  const reply: any = {
    statusCode: 200,
    body: undefined as unknown,
    header(name: string, value: string) {
      headers[name] = value;
      return reply;
    },
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(payload: unknown) {
      reply.body = payload;
      return reply;
    },
    headers,
  };
  return reply;
}

function request(ifNoneMatch?: string) {
  return {
    params: { siteId: "42" },
    headers: ifNoneMatch ? { "if-none-match": ifNoneMatch } : {},
  } as any;
}

describe("getSiteIcon", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("serves the icon with a revalidating ETag", async () => {
    findFirst.mockResolvedValue({ icon: ICON });
    const reply = replyStub();

    await getSiteIcon(request(), reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual(ICON);
    expect(reply.headers["ETag"]).toMatch(/^"[a-f0-9]{40}"$/);
    expect(reply.headers["Cache-Control"]).toContain("must-revalidate");
  });

  it("returns 304 when the client already has that icon", async () => {
    findFirst.mockResolvedValue({ icon: ICON });
    const first = replyStub();
    await getSiteIcon(request(), first);

    findFirst.mockResolvedValue({ icon: ICON });
    const second = replyStub();
    await getSiteIcon(request(first.headers["ETag"]), second);

    expect(second.statusCode).toBe(304);
  });

  it("serves a re-uploaded icon instead of a 304", async () => {
    findFirst.mockResolvedValue({ icon: ICON });
    const before = replyStub();
    await getSiteIcon(request(), before);

    // Same URL, different bytes — the stale ETag must no longer match.
    findFirst.mockResolvedValue({ icon: Buffer.from("different-png-bytes") });
    const after = replyStub();
    await getSiteIcon(request(before.headers["ETag"]), after);

    expect(after.statusCode).toBe(200);
    expect(after.headers["ETag"]).not.toBe(before.headers["ETag"]);
  });

  it("404s when the site has no icon", async () => {
    findFirst.mockResolvedValue({ icon: null });
    const reply = replyStub();

    await getSiteIcon(request(), reply);

    expect(reply.statusCode).toBe(404);
  });
});
