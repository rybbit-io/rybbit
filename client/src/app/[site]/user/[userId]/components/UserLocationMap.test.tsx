import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserInfo } from "@/api/analytics/endpoints";
import { UserLocationMap } from "./UserLocationMap";
import { UserSidebar } from "./UserSidebar";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn<typeof fetch>(),
  map: vi.fn(function () {
    return { remove: vi.fn() };
  }),
  setLngLat: vi.fn().mockReturnThis(),
}));

vi.mock("mapbox-gl", () => ({
  default: {
    Map: mocks.map,
    Marker: vi.fn(function () {
      return { setLngLat: mocks.setLngLat, addTo: vi.fn().mockReturnThis(), remove: vi.fn() };
    }),
  },
}));
vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "dark" }) }));
vi.mock("@/lib/configs", () => ({ useConfigs: () => ({ configs: { mapboxToken: "test-token" } }) }));
vi.mock("@/lib/userStore", () => ({ userStore: () => ({ user: null }) }));
vi.mock("@/components/EditTraitsDialog", () => ({ EditTraitsDialog: () => null }));
vi.mock("./Calendar", () => ({ VisitCalendar: () => null }));

const regionNames: Record<string, string> = {
  "ES-MD": "Madrid, Comunidad de",
  "AU-WA": "Western Australia",
};
const getRegionName = (region: string) => regionNames[region] ?? "";

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ features: [{ center: [-3.701219, 40.421345] }] })));
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function showSidebar(location: Pick<UserInfo, "country" | "region" | "city">, resolveRegion = getRegionName) {
  return render(
    <QueryClientProvider client={client}>
      <UserSidebar
        data={location as UserInfo}
        isLoading={false}
        sessionCount={[]}
        isLoadingCalendar={false}
        getRegionName={resolveRegion}
      />
    </QueryClientProvider>
  );
}

async function geocodingRequest() {
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());
  const url = new URL(String(mocks.fetch.mock.calls[0][0]));
  const query = decodeURIComponent(
    url.pathname
      .split("/")
      .at(-1)!
      .replace(/\.json$/, "")
  );
  return { url, query };
}

describe("user location geocoding", () => {
  it.each([
    {
      country: "ES",
      region: "ES-MD",
      city: "Madrid",
      query: "Madrid, Madrid, Comunidad de, Spain",
    },
    {
      country: "AU",
      region: "AU-WA",
      city: "Perth",
      query: "Perth, Western Australia, Australia",
    },
  ])("resolves region names and restricts $city to its country", async ({ country, region, city, query }) => {
    showSidebar({ country, region, city });

    const request = await geocodingRequest();
    expect(request.query).toBe(query);
    expect(request.url.searchParams.get("country")).toBe(country.toLowerCase());
  });

  it.each(["", "ES-UNKNOWN", "ES-MD"])("omits an unavailable region name (%s)", async region => {
    showSidebar({ country: "ES", region, city: "Madrid" }, () => "");

    const { url, query } = await geocodingRequest();
    expect(query).toBe("Madrid, Spain");
    expect(url.searchParams.get("country")).toBe("es");
  });

  it("can locate a user when only the country is known", async () => {
    showSidebar({ country: "ES", region: "", city: "" });

    const { url, query } = await geocodingRequest();
    expect(query).toBe("Spain");
    expect(url.searchParams.get("country")).toBe("es");
  });

  it("positions the map and marker at the geocoded coordinates", async () => {
    showSidebar({ country: "ES", region: "ES-MD", city: "Madrid" });

    await waitFor(() => expect(mocks.setLngLat).toHaveBeenCalledWith([-3.701219, 40.421345]));
    expect(mocks.map).toHaveBeenCalledWith(expect.objectContaining({ center: [-3.701219, 40.421345] }));
  });

  it("leaves the map hidden when there is no match in the country", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ features: [] })));
    const { container } = render(
      <QueryClientProvider client={client}>
        <UserLocationMap country="ES" region="" city="Unknown city" />
      </QueryClientProvider>
    );

    const { url } = await geocodingRequest();
    expect(url.searchParams.get("country")).toBe("es");
    await waitFor(() => expect(container.innerHTML).toBe(""));
    expect(mocks.map).not.toHaveBeenCalled();
  });
});
