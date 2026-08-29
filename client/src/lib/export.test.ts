import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { formatDateForFilename, generateCSV, generateCSVWithColumns } from "./export";

const parseCSV = (csv: string) =>
  Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

describe("generateCSV", () => {
  it("returns an empty document when there are no rows", () => {
    expect(generateCSV([])).toBe("");
  });

  it("emits headers and values from ordinary records", () => {
    const parsed = parseCSV(
      generateCSV([
        { page: "/", visitors: 20 },
        { page: "/pricing", visitors: 7 },
      ])
    );

    expect(parsed.meta.fields).toEqual(["page", "visitors"]);
    expect(parsed.data).toEqual([
      { page: "/", visitors: "20" },
      { page: "/pricing", visitors: "7" },
    ]);
    expect(parsed.errors).toEqual([]);
  });

  it("round-trips commas, quotes, and line breaks as CSV data", () => {
    const data = [{ page: "/docs,getting-started", title: 'Read "this"\nfirst' }];

    expect(parseCSV(generateCSV(data)).data).toEqual(data);
  });
});

describe("generateCSVWithColumns", () => {
  it("uses the requested column order and excludes unselected fields", () => {
    const csv = generateCSVWithColumns([{ browser: "Firefox", visitors: 12, internalId: 99 }], ["visitors", "browser"]);
    const parsed = parseCSV(csv);

    expect(parsed.meta.fields).toEqual(["visitors", "browser"]);
    expect(parsed.data).toEqual([{ visitors: "12", browser: "Firefox" }]);
    expect(csv).not.toContain("internalId");
  });

  it("normalizes missing and null values to empty cells", () => {
    const parsed = parseCSV(
      generateCSVWithColumns(
        [
          { page: "/one", title: null },
          { page: "/two", title: undefined },
        ],
        ["page", "title"]
      )
    );

    expect(parsed.data).toEqual([
      { page: "/one", title: "" },
      { page: "/two", title: "" },
    ]);
  });

  it("serializes object and array cells as JSON instead of losing their structure", () => {
    const parsed = parseCSV(
      generateCSVWithColumns(
        [{ properties: { plan: "pro", seats: 3 }, tags: ["trial", "annual"] }],
        ["properties", "tags"]
      )
    );

    expect(parsed.data).toEqual([
      {
        properties: '{"plan":"pro","seats":3}',
        tags: '["trial","annual"]',
      },
    ]);
  });

  it("can emit a header-only export for a known schema", () => {
    const csv = generateCSVWithColumns([], ["timestamp", "pathname"]);

    expect(csv).toBe("timestamp,pathname\r\n");
    expect(Papa.parse(csv, { header: true }).meta.fields).toEqual(["timestamp", "pathname"]);
  });

  it("returns an empty document only when both rows and columns are absent", () => {
    expect(generateCSVWithColumns([], [])).toBe("");
  });
});

describe("formatDateForFilename", () => {
  it("formats the UTC calendar date independent of the local timezone", () => {
    expect(formatDateForFilename(new Date("2026-01-02T23:59:59.999-08:00"))).toBe("2026-01-03");
  });
});
