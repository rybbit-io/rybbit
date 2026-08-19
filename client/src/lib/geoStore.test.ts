import { afterEach, describe, expect, it } from "vitest";
import { useGeoStore } from "./geoStore";
import type { Subdivisions } from "./geoStore";

const subdivisions: Subdivisions = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Azerbaijan",
        iso_3166_2: "",
        admin: "Azerbaijan",
        border: 4,
      },
      geometry: { type: "Polygon", coordinates: [] },
    },
    {
      type: "Feature",
      properties: {
        name: "Henan Sheng",
        iso_3166_2: "CN-HA",
        admin: "China",
        border: 0,
      },
      geometry: { type: "Polygon", coordinates: [] },
    },
  ],
};

afterEach(() => {
  useGeoStore.setState({ subdivisions: null });
});

describe("getRegionName", () => {
  it("does not match malformed subdivision data when the region is missing", () => {
    useGeoStore.setState({ subdivisions });

    expect(useGeoStore.getState().getRegionName("")).toBe("");
  });

  it("returns a matching region name", () => {
    useGeoStore.setState({ subdivisions });

    expect(useGeoStore.getState().getRegionName("CN-HA")).toBe("Henan Sheng");
  });

  it("returns an empty string for an unknown region", () => {
    useGeoStore.setState({ subdivisions });

    expect(useGeoStore.getState().getRegionName("XX-NOTREAL")).toBe("");
  });
});
