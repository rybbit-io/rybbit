import { describe, expect, it } from "vitest";
import { parseCityValue } from "./geo";

describe("parseCityValue", () => {
  it("splits country, region and city", () => {
    expect(parseCityValue("US-CA-San Francisco")).toEqual({ country: "US", region: "CA", city: "San Francisco" });
  });

  it("keeps hyphens inside the city name", () => {
    expect(parseCityValue("US-NC-Winston-Salem")).toEqual({ country: "US", region: "NC", city: "Winston-Salem" });
    expect(parseCityValue("FR-PAC-Aix-en-Provence")).toEqual({ country: "FR", region: "PAC", city: "Aix-en-Provence" });
  });

  it("handles a city without a region", () => {
    expect(parseCityValue("-Paris")).toEqual({ country: "", region: "", city: "Paris" });
    expect(parseCityValue("-Saint-Denis")).toEqual({ country: "", region: "", city: "Saint-Denis" });
  });
});
