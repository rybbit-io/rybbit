import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

describe("onboarding routes", () => {
  it("serves /try instead of treating it as a site ID", async () => {
    const response = await proxy(new NextRequest("https://app.rybbit.io/try?domain=acme.dev"));
    expect(response.headers.get("location")).toBeNull();
  });
  it("preserves the OAuth claim flag when opening a private dashboard", async () => {
    const response = await proxy(new NextRequest("https://app.rybbit.io/7/aaaaaaaaaaaa?claim=1"));
    expect(response.headers.get("location")).toBe("https://app.rybbit.io/7/aaaaaaaaaaaa/main?claim=1");
  });
  it("preserves the checkout session on the owned dashboard redirect", async () => {
    const response = await proxy(new NextRequest("https://app.rybbit.io/7?session_id=cs_test"));
    expect(response.headers.get("location")).toBe("https://app.rybbit.io/7/main?session_id=cs_test");
  });
});
