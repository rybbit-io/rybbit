import { describe, expect, it } from "vitest";
import { ProjectRateLimiter } from "./projectRateLimiter.js";

describe("ProjectRateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = new ProjectRateLimiter(2, 1000);
    expect(limiter.isAllowed("proj")).toBe(true);
    expect(limiter.isAllowed("proj")).toBe(true);
  });

  it("blocks requests when limit exceeded", () => {
    const limiter = new ProjectRateLimiter(1, 1000);
    expect(limiter.isAllowed("proj")).toBe(true);
    expect(limiter.isAllowed("proj")).toBe(false);
  });

  it("resets after the window passes", async () => {
    const limiter = new ProjectRateLimiter(1, 10);
    expect(limiter.isAllowed("proj")).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 15));
    limiter.cleanup(Date.now());
    expect(limiter.isAllowed("proj")).toBe(true);
  });
});
