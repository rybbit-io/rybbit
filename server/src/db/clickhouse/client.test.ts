import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn((_options: unknown) => ({})) }));

vi.mock("@clickhouse/client", () => ({ createClient: mocks.createClient }));

// Writers serialise instants as ISO-8601 with an explicit `Z` (dateTime.ts).
// ClickHouse's default `basic` parser rejects the offset, so the write client
// has to ask for best_effort or every insert fails with CANNOT_PARSE_INPUT.
describe("clickhouse write client", () => {
  it("parses inserted timestamps with best_effort", async () => {
    await import("./client.js");

    const writeClientOptions = mocks.createClient.mock.calls[0][0] as {
      clickhouse_settings?: Record<string, unknown>;
    };
    expect(writeClientOptions.clickhouse_settings).toMatchObject({ date_time_input_format: "best_effort" });
  });
});
