import { describe, expect, it } from "vitest";
import { getSourceType } from "./const.js";
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
    expect(getChannel("https://example.com/page", "utm_source=custom_source", "example.com")).not.toBe("Referral");
  });
});

describe("getChannel - brand domains", () => {
  it.each([
    "google.example.net",
    "shop.amazon.example.net",
    "google.com.example.net",
    "shop.amazon.com.example.net",
    "notgoogle.com",
    "notgoogle.de",
    "google.invalidsuffix",
  ])("does not classify %s as a brand", host => {
    expect(getChannel(`https://${host}/`, "", "mysite.org")).toBe("Referral");
    expect(getChannel("", `utm_source=${host}&utm_medium=referral`)).toBe("Referral");
  });

  it.each(["https://example.net/google.com", "https://example.net/?site=amazon.com", "//example.net/google.de"])(
    "does not classify a brand outside the hostname in %s",
    source => {
      expect(getChannel("", `utm_source=${encodeURIComponent(source)}&utm_medium=referral`)).toBe("Referral");
    }
  );

  it.each(["amazon.com/prime-video", "https://amazon.com/prime-video/", "//www.amazon.com/prime-video/movie"])(
    "preserves explicit domain/path entry %s",
    source => {
      expect(getSourceType(source)).toBe("video");
    }
  );

  it("does not match a domain/path entry on an unrelated host", () => {
    expect(getSourceType("https://amazon.com.example.net/prime-video")).not.toBe("video");
  });

  it.each([
    ["google.de", "Organic Search"],
    ["www.google.co.uk", "Organic Search"],
    ["search.yahoo.co.jp", "Organic Search"],
    ["shop.amazon.co.uk", "Organic Shopping"],
  ])("keeps %s classified as %s", (host, channel) => {
    expect(getChannel(`https://${host}/`, "", "mysite.org")).toBe(channel);
    expect(getChannel("", `utm_source=https://${host}/&utm_medium=referral`)).toBe(channel);
  });

  it("keeps recognized Android package IDs separate from brand domains", () => {
    expect(getSourceType("com.google.android.gm")).toBe("email");
    expect(getSourceType("com.google.android.youtube")).toBe("video");
    expect(getSourceType("com.amazon.mShop")).toBe("shopping");
    expect(getChannel("", "utm_source=com.google.android.gm")).toBe("Email");
  });
});
