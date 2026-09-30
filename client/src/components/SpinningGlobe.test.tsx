import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event: unknown) => void;
type FakeMapInstance = {
  fire: (event: string) => void;
  easeTo: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => ({ reducedMotion: false, maps: [] as FakeMapInstance[] }));

vi.mock("mapbox-gl", () => {
  class FakeMap {
    handlers = new Map<string, Handler[]>();
    // Like Mapbox (respectPrefersReducedMotion defaults to true), reduced motion makes easeTo
    // instant, and an instant ease fires "moveend" synchronously.
    easeTo = vi.fn(() => {
      if (mocks.reducedMotion) this.fire("moveend");
    });
    stop = vi.fn(() => this.fire("moveend"));
    constructor() {
      mocks.maps.push(this);
    }
    on(event: string, layerOrHandler: string | Handler, handler?: Handler) {
      const fn = typeof layerOrHandler === "function" ? layerOrHandler : handler!;
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
      return this;
    }
    off() {
      return this;
    }
    fire(event: string) {
      (this.handlers.get(event) ?? []).forEach(fn => fn({}));
    }
    getZoom() {
      return 1.5;
    }
    getCenter() {
      return { lng: 0, lat: 20 };
    }
    getLayer() {
      return undefined;
    }
    setPaintProperty() {}
    setFog() {}
    addSource() {}
    addLayer() {}
    remove() {}
  }
  return { default: { Map: FakeMap, Marker: class {}, accessToken: "" } };
});
vi.mock("../lib/configs", () => ({ useConfigs: () => ({ configs: { mapboxToken: "pk.test" }, isLoading: false }) }));

import { SpinningGlobe } from "./SpinningGlobe";

function renderGlobe() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SpinningGlobe />
    </QueryClientProvider>
  );
  const map = mocks.maps.at(-1)!;
  act(() => map.fire("style.load"));
  return map;
}

beforeEach(() => {
  mocks.maps = [];
  mocks.reducedMotion = false;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as RenderingContext);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ data: [] }) }))
  );
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => {
      const preference = Object.assign(new EventTarget(), { media: query });
      Object.defineProperty(preference, "matches", { get: () => mocks.reducedMotion });
      return preference;
    },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SpinningGlobe", () => {
  it("spins at one revolution per two minutes by default", () => {
    mocks.reducedMotion = false;
    const map = renderGlobe();
    expect(map.easeTo).toHaveBeenCalledTimes(1);
    expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: { lng: -3, lat: 20 }, duration: 1000 }));
  });

  it("stays still under reduced motion, including after the user lets go", () => {
    mocks.reducedMotion = true;
    const map = renderGlobe();
    act(() => map.fire("mouseup"));
    act(() => map.fire("dragend"));
    expect(map.easeTo).not.toHaveBeenCalled();
  });

  it("resumes and stops idle spin when the motion preference changes", () => {
    mocks.reducedMotion = true;
    const preference = new EventTarget();
    Object.defineProperty(preference, "matches", { get: () => mocks.reducedMotion });
    vi.spyOn(window, "matchMedia").mockReturnValue(preference as MediaQueryList);
    const map = renderGlobe();
    expect(map.easeTo).not.toHaveBeenCalled();

    mocks.reducedMotion = false;
    act(() => preference.dispatchEvent(new Event("change")));
    expect(map.easeTo).toHaveBeenCalledTimes(1);

    mocks.reducedMotion = true;
    act(() => preference.dispatchEvent(new Event("change")));
    expect(map.stop).toHaveBeenCalledOnce();
    expect(map.easeTo).toHaveBeenCalledTimes(1);

    cleanup();
    mocks.reducedMotion = false;
    act(() => preference.dispatchEvent(new Event("change")));
    expect(map.easeTo).toHaveBeenCalledTimes(1);
  });
});
