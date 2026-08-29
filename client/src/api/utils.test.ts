import axios, { AxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BACKEND_URL } from "../lib/const";
import { setPrivateKeyResolver } from "./requestContext";
import { authedFetch } from "./utils";

vi.mock("axios", () => ({ default: vi.fn() }));

const axiosMock = vi.mocked(axios);

const lastRequest = () => axiosMock.mock.calls.at(-1)?.[0] as AxiosRequestConfig;

afterEach(() => {
  axiosMock.mockReset();
  setPrivateKeyResolver(() => null);
});

describe("authedFetch", () => {
  it("prefixes relative API paths, sends credentials, and returns response data", async () => {
    const payload = { sites: [{ id: 7 }] };
    axiosMock.mockResolvedValue({ data: payload });

    await expect(authedFetch("/sites")).resolves.toBe(payload);
    expect(lastRequest()).toEqual({
      url: `${BACKEND_URL}/sites`,
      params: undefined,
      withCredentials: true,
      headers: {},
    });
  });

  it("leaves absolute URLs unchanged", async () => {
    axiosMock.mockResolvedValue({ data: "ok" });

    await authedFetch("https://example.test/report");

    expect(lastRequest().url).toBe("https://example.test/report");
  });

  it("JSON-encodes top-level array parameters without mutating the caller's object", async () => {
    axiosMock.mockResolvedValue({ data: "ok" });
    const params = {
      filters: [{ parameter: "browser", type: "equals", value: ["Chrome"] }],
      tags: ["one", "two"],
      page: 2,
      options: { includeBots: false },
    };

    await authedFetch("/report", params);

    expect(lastRequest().params).toEqual({
      filters: JSON.stringify(params.filters),
      tags: '["one","two"]',
      page: 2,
      options: { includeBots: false },
    });
    expect(lastRequest().params).not.toBe(params);
    expect(params.tags).toEqual(["one", "two"]);
    expect(params.filters).toEqual([{ parameter: "browser", type: "equals", value: ["Chrome"] }]);
  });

  it("passes method and body configuration through to axios", async () => {
    axiosMock.mockResolvedValue({ data: { saved: true } });
    const data = { name: "Weekly report" };

    await authedFetch("/reports", { notify: true }, { method: "POST", data, timeout: 5_000 });

    expect(lastRequest()).toMatchObject({
      method: "POST",
      data,
      timeout: 5_000,
      params: { notify: true },
      withCredentials: true,
    });
  });

  it("combines caller headers with the current shared-dashboard private key", async () => {
    axiosMock.mockResolvedValue({ data: "ok" });
    let privateKey: string | null = "abcdef123456";
    setPrivateKeyResolver(() => privateKey);

    await authedFetch("/sites/42/overview", undefined, {
      headers: { "x-client": "dashboard", "x-private-key": "stale-key" },
    });

    expect(lastRequest().headers).toEqual({
      "x-client": "dashboard",
      "x-private-key": "abcdef123456",
    });

    privateKey = "123456abcdef";
    await authedFetch("/sites/42/sessions");
    expect(lastRequest().headers).toEqual({ "x-private-key": "123456abcdef" });
  });

  it("does not send a private-key header outside a shared dashboard", async () => {
    axiosMock.mockResolvedValue({ data: "ok" });
    setPrivateKeyResolver(() => null);

    await authedFetch("/sites/42/overview", undefined, { headers: { Accept: "application/json" } });

    expect(lastRequest().headers).toEqual({ Accept: "application/json" });
    expect(lastRequest().headers).not.toHaveProperty("x-private-key");
  });

  it("surfaces the backend's public error message", async () => {
    axiosMock.mockRejectedValue({
      response: { data: { error: "You do not have access to this site" } },
    });

    await expect(authedFetch("/sites/42")).rejects.toThrow("You do not have access to this site");
  });

  it("rethrows transport and malformed-response failures unchanged", async () => {
    const networkError = new Error("socket closed");
    axiosMock.mockRejectedValue(networkError);

    await expect(authedFetch("/sites")).rejects.toBe(networkError);

    const malformedError = { response: { data: { message: "unexpected payload" } } };
    axiosMock.mockRejectedValue(malformedError);
    await expect(authedFetch("/sites")).rejects.toBe(malformedError);
  });
});
