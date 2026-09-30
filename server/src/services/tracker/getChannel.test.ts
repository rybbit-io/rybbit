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
    expect(getChannel("https://example.com/page", "utm_source=custom_source", "example.com")).not.toBe("Referral");
  });
});

const fromReferrer = (host: string) => getChannel(`https://${host}/some/page`, "", "example.org");

describe("getChannel - referrer domain matching", () => {
  it("does not match a listed domain inside a longer hostname", () => {
    // "x.com" and "t.co" used to match any host ending in x.com / t.com
    for (const host of ["dropbox.com", "wix.com", "firefox.com", "microsoft.com", "producthunt.com", "about.me"]) {
      expect(fromReferrer(host), host).toBe("Referral");
    }
    expect(fromReferrer("netflix.com")).toBe("Organic Video");
    expect(fromReferrer("walmart.com")).toBe("Organic Shopping");
    expect(fromReferrer("target.com")).toBe("Organic Shopping");
    // "you.com" and "pi.ai" are AI; hosts that merely end in those letters are not
    expect(fromReferrer("bayou.com")).toBe("Referral");
    expect(fromReferrer("api.ai")).toBe("Referral");
  });

  it("matches listed domains and their subdomains", () => {
    expect(fromReferrer("t.co")).toBe("Organic Social");
    expect(fromReferrer("x.com")).toBe("Organic Social");
    expect(fromReferrer("l.facebook.com")).toBe("Organic Social");
    expect(fromReferrer("www.perplexity.ai")).toBe("AI");
  });

  it("matches brand entries across country TLDs at a label boundary", () => {
    expect(fromReferrer("www.google.co.uk")).toBe("Organic Search");
    expect(fromReferrer("google.de")).toBe("Organic Search");
    expect(fromReferrer("search.yahoo.co.jp")).toBe("Organic Search");
    expect(fromReferrer("yandex.com.tr")).toBe("Organic Search");
    expect(fromReferrer("amazon.co.uk")).toBe("Organic Shopping");
    expect(getChannel("android-app://com.google.android.googlequicksearchbox/", "", "example.org")).toBe(
      "Organic Search"
    );
    expect(fromReferrer("googleusercontent.com")).toBe("Referral");
  });

  it("lets the most specific entry win over a broader search entry", () => {
    expect(fromReferrer("mail.google.com")).toBe("Email");
    expect(getChannel("android-app://com.google.android.gm/", "", "example.org")).toBe("Email");
    expect(fromReferrer("mail.yahoo.com")).toBe("Email");
    expect(fromReferrer("outlook.live.com")).toBe("Email");
    expect(fromReferrer("docs.google.com")).toBe("Referral");
    expect(fromReferrer("accounts.google.com")).toBe("Referral");
    expect(fromReferrer("gemini.google.com")).toBe("AI");
    expect(fromReferrer("aistudio.google.com")).toBe("AI");
    expect(fromReferrer("edgeservices.bing.com")).toBe("AI");
    expect(fromReferrer("tieba.baidu.com")).toBe("Organic Social");
  });

  it("classifies YouTube and Twitch as video, not social", () => {
    expect(fromReferrer("www.youtube.com")).toBe("Organic Video");
    expect(fromReferrer("m.youtube.com")).toBe("Organic Video");
    expect(fromReferrer("youtu.be")).toBe("Organic Video");
    expect(fromReferrer("www.twitch.tv")).toBe("Organic Video");
    expect(fromReferrer("www.tiktok.com")).toBe("Organic Social");
    expect(getChannel("", "utm_source=youtube&utm_medium=paid")).toBe("Paid Video");
  });

  it("recognises current social and AI sources", () => {
    for (const host of ["www.threads.com", "threads.net", "www.xiaohongshu.com", "lobste.rs", "fosstodon.org"]) {
      expect(fromReferrer(host), host).toBe("Organic Social");
    }
    for (const host of [
      "duck.ai",
      "kimi.com",
      "www.doubao.com",
      "manus.im",
      "copilot.cloud.microsoft",
      "chat.qwen.ai",
    ]) {
      expect(fromReferrer(host), host).toBe("AI");
    }
    expect(fromReferrer("duckduckgo.com")).toBe("Organic Search");
    expect(fromReferrer("search.brave.com")).toBe("Organic Search");
  });

  it("classifies Meta ads source names as paid social", () => {
    expect(getChannel("", "utm_source=meta&utm_medium=paid")).toBe("Paid Social");
    expect(getChannel("", "utm_source=an&utm_medium=paid")).toBe("Paid Social");
    expect(getChannel("", "utm_source=x&utm_medium=social")).toBe("Organic Social");
  });
});

describe("getChannel - country sites and URL-valued sources", () => {
  it("covers country sites of a listed domain", () => {
    for (const host of ["shopee.com.my", "lazada.com.ph", "mercadolibre.com.mx", "rakuten.com.tw", "walmart.com.mx"]) {
      expect(fromReferrer(host), host).toBe("Organic Shopping");
    }
    expect(getChannel("", "utm_source=shopee.com.my&utm_medium=paid")).toBe("Paid Shopping");
    expect(fromReferrer("mail.google.com.br")).toBe("Email");
    // stripping the country code must not create new substring-style collisions
    expect(fromReferrer("microsoft.co.il")).toBe("Referral");
    expect(fromReferrer("pi.ai.uk")).toBe("Referral");
    expect(fromReferrer("t.co.uk")).toBe("Referral");
  });

  it("reads the host out of URL-valued UTM sources", () => {
    expect(getChannel("", "utm_source=https%3A%2F%2Ffacebook.com%2F&utm_medium=cpc")).toBe("Paid Social");
    expect(getChannel("", "utm_source=https%3A%2F%2Fwww.perplexity.ai%2F&utm_medium=paid")).toBe("Paid AI");
    expect(getChannel("", "utm_source=chatgpt.com%2Fc%2F123")).toBe("AI");
    expect(getChannel("", "utm_source=https%3A%2F%2Fuser%40facebook.com%2F&utm_medium=cpc")).toBe("Paid Social");
    expect(getChannel("", "utm_source=%2F%2Ffacebook.com%2F&utm_medium=cpc")).toBe("Paid Social");
    expect(getChannel("", "utm_source=android-app%3A%2F%2Fcom.google.android.gm%2F")).toBe("Email");
  });
});

describe("getChannel - self-referrals", () => {
  it("classifies navigation between the site's own hosts as Internal", () => {
    expect(getChannel("https://www.example.org/a", "", "example.org")).toBe("Internal");
    expect(getChannel("https://blog.example.org/a", "", "example.org")).toBe("Internal");
  });

  it("keeps campaign-tagged self-referrals out of Internal", () => {
    expect(getChannel("https://www.example.org/a", "utm_source=newsletter&utm_medium=email", "example.org")).toBe(
      "Email"
    );
  });

  it("does not treat a sibling subdomain as a self-referral", () => {
    expect(getChannel("https://blog.example.org/a", "", "app.example.org")).toBe("Referral");
  });
});
