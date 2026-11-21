import axios, { AxiosRequestConfig } from "axios";
import Papa from "papaparse";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BACKEND_URL } from "../../../lib/const";
import { generateCSV } from "../../../lib/export";
import { fetchGSCData, GSCDimension } from "./data";

vi.mock("axios", () => ({ default: vi.fn() }));

const axiosMock = vi.mocked(axios);
const lastRequest = () => axiosMock.mock.calls.at(-1)?.[0] as AxiosRequestConfig;

afterEach(() => {
  axiosMock.mockReset();
});

describe("fetchGSCData", () => {
  it.each<[GSCDimension, string]>([
    ["query", 'analytics, "privacy"'],
    ["page", "https://example.test/docs"],
    ["country", "US"],
    ["device", "MOBILE"],
  ])("requests %s through dimensions and keeps dashboard and CSV rows unchanged", async (dimension, name) => {
    const metrics = { clicks: 12, impressions: 200, ctr: 0.06, position: 3.5 };
    axiosMock.mockResolvedValue({ data: { data: [{ [dimension]: name, ...metrics }] } });

    const rows = await fetchGSCData("site-42", {
      dimension,
      startDate: "2026-09-01",
      endDate: "2026-09-28",
      timeZone: "America/Los_Angeles",
    });

    expect(lastRequest()).toMatchObject({
      url: `${BACKEND_URL}/sites/site-42/gsc/data`,
      params: {
        dimensions: dimension,
        start_date: "2026-09-01",
        end_date: "2026-09-28",
        time_zone: "America/Los_Angeles",
      },
    });
    expect(lastRequest().params).not.toHaveProperty("dimension");
    expect(rows).toEqual([{ name, ...metrics }]);

    const csv = Papa.parse<Record<string, string>>(generateCSV(rows), { header: true });
    expect(csv.meta.fields).toEqual(["name", "clicks", "impressions", "ctr", "position"]);
    expect(csv.data).toEqual([{ name, clicks: "12", impressions: "200", ctr: "0.06", position: "3.5" }]);
    expect(csv.errors).toEqual([]);
  });

  it("returns an empty dashboard result when the API has no rows", async () => {
    axiosMock.mockResolvedValue({ data: { data: [] } });

    await expect(
      fetchGSCData(42, {
        dimension: "query",
        startDate: "2026-09-01",
        endDate: "2026-09-28",
        timeZone: "UTC",
      })
    ).resolves.toEqual([]);
  });
});
