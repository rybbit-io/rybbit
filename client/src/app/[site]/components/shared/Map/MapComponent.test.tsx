import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loading: { country: false, region: false } as Record<string, boolean>,
  // Stable references, like React Query: MapComponent bumps a version whenever data identity changes.
  data: { country: { data: [] }, region: { data: [] } } as Record<string, { data: never[] }>,
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@/api/analytics/hooks/useGetMetric", () => ({
  useMetric: ({ parameter }: { parameter: string }) => ({
    data: mocks.loading[parameter] ? undefined : mocks.data[parameter],
    isLoading: mocks.loading[parameter],
    isFetching: mocks.loading[parameter],
  }),
}));
vi.mock("@/lib/geo", () => ({ useCountries: () => ({ data: null }), useSubdivisions: () => ({ data: null }) }));
vi.mock("@uidotdev/usehooks", () => ({ useMeasure: () => [() => {}, { height: 340 }] }));
vi.mock("./hooks/useMapInstance", () => ({
  useMapInstance: () => ({
    mapRef: { current: null },
    mapInstanceRef: { current: null },
    mapViewRef: { current: null },
  }),
}));
vi.mock("./hooks/useMapLayers", () => ({ useMapLayers: () => {} }));
vi.mock("./hooks/useMapStyles", () => ({ useMapStyles: () => ({ colorScale: () => "" }) }));
vi.mock("../icons/CountryFlag", () => ({ CountryFlag: () => null }));

import { MapComponent } from "./MapComponent";

const overlay = () => screen.queryByText("Loading map data…");

afterEach(cleanup);

describe("MapComponent loading overlay", () => {
  it("covers the country view while country data loads", () => {
    mocks.loading = { country: true, region: false };
    render(<MapComponent height="340px" />);
    expect(overlay()).toBeTruthy();
  });

  it("doesn't hold the country view for the region query", () => {
    mocks.loading = { country: false, region: true };
    render(<MapComponent height="340px" />);
    expect(overlay()).toBeNull();
  });

  it("covers the region view while region data loads", () => {
    mocks.loading = { country: false, region: true };
    render(<MapComponent height="340px" mapView="subdivisions" />);
    expect(overlay()).toBeTruthy();
  });

  it("is scoped to the map box and gone once data is in", () => {
    mocks.loading = { country: true, region: false };
    const { container, rerender } = render(<MapComponent height="340px" />);
    expect((container.firstChild as HTMLElement).className).toContain("relative");
    mocks.loading = { country: false, region: false };
    rerender(<MapComponent height="340px" />);
    expect(overlay()).toBeNull();
  });
});
