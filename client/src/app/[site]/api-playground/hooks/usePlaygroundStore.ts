import { Filter } from "@rybbit/shared";
import { DateTime } from "luxon";
import { create } from "zustand";
import { EndpointConfig } from "../utils/endpointConfig";

interface PlaygroundFilter {
  parameter: string;
  operator: string;
  value: string;
}

interface PlaygroundState {
  // Selected endpoint
  selectedEndpoint: EndpointConfig | null;
  setSelectedEndpoint: (endpoint: EndpointConfig | null) => void;

  // Common parameters (independent from store.ts)
  startDate: string;
  endDate: string;
  timeZone: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setTimeZone: (tz: string) => void;

  // Filters
  filters: PlaygroundFilter[];
  addFilter: () => void;
  updateFilter: (index: number, filter: PlaygroundFilter) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;

  // Convert playground filters to API format
  getApiFilters: () => Filter[];

  // Endpoint-specific params (dynamic)
  endpointParams: Record<string, string>;
  setEndpointParam: (key: string, value: string) => void;
  clearEndpointParams: () => void;

  // Path params (e.g., sessionId, goalId)
  pathParams: Record<string, string>;
  setPathParam: (key: string, value: string) => void;
  clearPathParams: () => void;

  // Request body for POST/PUT
  requestBody: string;
  setRequestBody: (body: string) => void;

  // Response state
  response: any;
  responseError: string | null;
  isLoading: boolean;
  responseTime: number | null;
  setResponse: (response: any, time: number) => void;
  setResponseError: (error: string) => void;
  setIsLoading: (loading: boolean) => void;
  clearResponse: () => void;

  // Reset all state
  reset: () => void;
}

// Get browser timezone or default to UTC
const getDefaultTimezone = () => {
  if (typeof window !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return "UTC";
};

// Get today's date in YYYY-MM-DD format
const getToday = () => DateTime.now().toISODate() ?? "";

export const usePlaygroundStore = create<PlaygroundState>((set, get) => ({
  // Selected endpoint
  selectedEndpoint: null,
  setSelectedEndpoint: (endpoint) =>
    set({
      selectedEndpoint: endpoint,
      endpointParams: {},
      pathParams: {},
      requestBody: endpoint?.requestBodyExample
        ? JSON.stringify(endpoint.requestBodyExample, null, 2)
        : "",
      response: null,
      responseError: null,
      responseTime: null,
    }),

  // Common parameters
  startDate: getToday(),
  endDate: getToday(),
  timeZone: getDefaultTimezone(),
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setTimeZone: (tz) => set({ timeZone: tz }),

  // Filters
  filters: [],
  addFilter: () =>
    set((state) => ({
      filters: [
        ...state.filters,
        { parameter: "country", operator: "equals", value: "" },
      ],
    })),
  updateFilter: (index, filter) =>
    set((state) => ({
      filters: state.filters.map((f, i) => (i === index ? filter : f)),
    })),
  removeFilter: (index) =>
    set((state) => ({
      filters: state.filters.filter((_, i) => i !== index),
    })),
  clearFilters: () => set({ filters: [] }),

  getApiFilters: () => {
    const { filters } = get();
    return filters
      .filter((f) => f.value.trim() !== "")
      .map((f) => ({
        parameter: f.parameter as Filter["parameter"],
        type: f.operator as Filter["type"],
        value: [f.value] as (string | number)[],
      }));
  },

  // Endpoint params
  endpointParams: {},
  setEndpointParam: (key, value) =>
    set((state) => ({
      endpointParams: { ...state.endpointParams, [key]: value },
    })),
  clearEndpointParams: () => set({ endpointParams: {} }),

  // Path params
  pathParams: {},
  setPathParam: (key, value) =>
    set((state) => ({
      pathParams: { ...state.pathParams, [key]: value },
    })),
  clearPathParams: () => set({ pathParams: {} }),

  // Request body
  requestBody: "",
  setRequestBody: (body) => set({ requestBody: body }),

  // Response
  response: null,
  responseError: null,
  isLoading: false,
  responseTime: null,
  setResponse: (response, time) =>
    set({
      response,
      responseTime: time,
      responseError: null,
      isLoading: false,
    }),
  setResponseError: (error) =>
    set({
      responseError: error,
      response: null,
      isLoading: false,
    }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearResponse: () =>
    set({ response: null, responseError: null, responseTime: null }),

  // Reset
  reset: () =>
    set({
      selectedEndpoint: null,
      startDate: getToday(),
      endDate: getToday(),
      timeZone: getDefaultTimezone(),
      filters: [],
      endpointParams: {},
      pathParams: {},
      requestBody: "",
      response: null,
      responseError: null,
      isLoading: false,
      responseTime: null,
    }),
}));

// Filter parameter options (hardcoded, no dynamic fetching)
export const filterParameters = [
  { value: "country", label: "Country" },
  { value: "region", label: "Region" },
  { value: "city", label: "City" },
  { value: "browser", label: "Browser" },
  { value: "operating_system", label: "Operating System" },
  { value: "device_type", label: "Device Type" },
  { value: "pathname", label: "Path" },
  { value: "referrer", label: "Referrer" },
  { value: "utm_source", label: "UTM Source" },
  { value: "utm_medium", label: "UTM Medium" },
  { value: "utm_campaign", label: "UTM Campaign" },
  { value: "channel", label: "Channel" },
  { value: "entry_page", label: "Entry Page" },
  { value: "exit_page", label: "Exit Page" },
  { value: "language", label: "Language" },
];

export const filterOperators = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
  { value: "regex", label: "Regex" },
];

// Re-export timezones from shared location for backwards compatibility
export { timezones as commonTimezones } from "@/lib/dateTimeUtils";
