import { describe, expect, it } from "vitest";
import { getChannel } from "./getChannel.js";

describe("getChannel - UTM parameter fallback", () => {
  it("classifies traffic with custom UTM parameters as Referral when no HTTP referrer is present", () => {
    expect(getChannel("", "utm_source=my_app&utm_medium=custom")).toBe("Referral");
    expect(getChannel("", "utm_source=gsuite_extension")).toBe("Referral");
    expect(getChannel("", "utm_medium=custom_link")).toBe("Referral");
    expect(getChannel("", "utm_campaign=custom_campaign")).toBe("Referral");
  });

  it("retains Direct classification when no referrer and no UTM parameters exist", () => {
    expect(getChannel("", "")).toBe("Direct");
  });

  it("retains Referral classification for external referring domains", () => {
    expect(getChannel("https://external-site.com/blog", "")).toBe("Referral");
    expect(
      getChannel("https://example.com/page", "utm_source=custom_source", "example.com"),
    ).not.toBe("Referral");    
  });
});
