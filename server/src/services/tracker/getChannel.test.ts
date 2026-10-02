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

describe("getChannel - paid medium detection", () => {
  it("does not treat mediums that merely contain a paid keyword as paid", () => {
    expect(getChannel("", "utm_source=github&utm_medium=readme")).toBe("Referral");
    expect(getChannel("", "utm_source=partner&utm_medium=download")).toBe("Referral");
    expect(getChannel("", "utm_source=shields&utm_medium=badge")).toBe("Referral");
    expect(getChannel("", "utm_source=partner&utm_medium=lead_magnet")).toBe("Referral");
    expect(getChannel("", "utm_source=partner&utm_medium=seminar")).toBe("Event");
  });

  it("still detects paid keywords in delimited mediums", () => {
    expect(getChannel("", "utm_source=google&utm_medium=cpc")).toBe("Paid Search");
    expect(getChannel("", "utm_source=facebook&utm_medium=paid_social")).toBe("Paid Social");
    expect(getChannel("", "utm_source=partner&utm_medium=display-ads")).toBe("Display");
    expect(getChannel("", "utm_source=partner&utm_medium=facebook ads")).toBe("Paid Unknown");
  });
});
