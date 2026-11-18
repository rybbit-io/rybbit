import { describe, expect, it } from "vitest";
import { AMBIGUOUS_ON_BROWSER, classifyUA, isBotUA } from "./index.js";
import { ALL_BOT_PATTERNS } from "./patterns.js";

describe("classifyUA", () => {
  it("returns NON_BOT for empty / nullish input", () => {
    expect(classifyUA("").isBot).toBe(false);
    expect(classifyUA(null).isBot).toBe(false);
    expect(classifyUA(undefined).isBot).toBe(false);
  });

  it("returns NON_BOT for typical real-browser UAs", () => {
    const realBrowsers = [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ];
    for (const ua of realBrowsers) {
      expect(classifyUA(ua).isBot, ua).toBe(false);
    }
  });

  it("categorizes AI crawlers as ai", () => {
    const aiBots = [
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
      "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com) AppleWebKit/537.36",
      "CCBot/2.0 (https://commoncrawl.org/faq/)",
      "Mozilla/5.0 (compatible; meta-externalagent/1.1; +https://developers.facebook.com/docs/sharing/webmasters/crawler)",
      "openai/1.0",
      "claude-code/0.5",
    ];
    for (const ua of aiBots) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("ai");
    }
  });

  it("categorizes search-engine crawlers as search", () => {
    const searchBots = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
      "DuckDuckGo-Favicons-Bot/1.0",
      "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)",
    ];
    for (const ua of searchBots) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("search");
    }
  });

  it("categorizes social link-preview bots as social", () => {
    const socialBots = [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Twitterbot/1.0",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "LinkedInBot/1.0 (compatible; Mozilla/5.0; +https://www.linkedin.com)",
    ];
    for (const ua of socialBots) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("social");
    }
  });

  it("categorizes HTTP frameworks / scripting clients as framework", () => {
    const frameworkUAs = [
      "python-requests/2.31.0",
      "curl/8.4.0",
      "Wget/1.21.4",
      "PostmanRuntime/7.36.0",
      "Apache-HttpClient/4.5.13 (Java/11.0.20)",
    ];
    for (const ua of frameworkUAs) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("framework");
    }
  });

  it("categorizes headless / automation as headless", () => {
    const headlessUAs = [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1",
      "Mozilla/5.0 Playwright/1.40.0 (Chromium; +https://playwright.dev)",
      "Mozilla/5.0 Selenium/4.16",
    ];
    for (const ua of headlessUAs) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("headless");
    }
  });

  it("categorizes uptime / synthetic monitors as monitoring", () => {
    const monitoringUAs = [
      "Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)",
      "Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)",
      "StatusCake_Pagespeed_Indev",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Chrome-Lighthouse",
    ];
    for (const ua of monitoringUAs) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("monitoring");
    }
  });

  it("categorizes SEO crawlers as seo", () => {
    const seoUAs = [
      "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
      "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
      "Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)",
      "Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot)",
    ];
    for (const ua of seoUAs) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("seo");
    }
  });

  it("names AI bots and splits them by purpose", () => {
    // `category: "ai"` covers a training crawler, an answer-engine indexer and
    // a fetch a person asked for a second ago. Only `purpose` tells them apart,
    // and the difference is the whole reason a site owner looks at this page.
    const cases: [string, string, string, string][] = [
      [
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
        "GPTBot",
        "OpenAI",
        "ai_training",
      ],
      ["Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)", "ClaudeBot", "Anthropic", "ai_training"],
      ["CCBot/2.0 (https://commoncrawl.org/faq/)", "CCBot", "Common Crawl", "ai_training"],
      ["Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)", "OAI-SearchBot", "OpenAI", "ai_search"],
      ["Mozilla/5.0 (compatible; PerplexityBot/1.0)", "PerplexityBot", "Perplexity", "ai_search"],
      ["Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)", "ChatGPT-User", "OpenAI", "ai_agent"],
      ["Mozilla/5.0 (compatible; Claude-User/1.0)", "Claude-User", "Anthropic", "ai_agent"],
      ["Mozilla/5.0 (compatible; Perplexity-User/1.0)", "Perplexity-User", "Perplexity", "ai_agent"],
      ["claude-code/1.0.0", "Claude Code", "Anthropic", "ai_agent"],
      ["Google-Agent", "Google-Agent", "Google", "ai_agent"],
    ];

    for (const [ua, name, operator, purpose] of cases) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.category, ua).toBe("ai");
      expect(cls.name, ua).toBe(name);
      expect(cls.operator, ua).toBe(operator);
      expect(cls.purpose, ua).toBe(purpose);
    }
  });

  it("names bots outside the AI family too", () => {
    expect(classifyUA("Mozilla/5.0 (compatible; AhrefsBot/7.0)")).toMatchObject({
      name: "AhrefsBot",
      operator: "Ahrefs",
      purpose: "seo",
    });
    expect(classifyUA("facebookexternalhit/1.1")).toMatchObject({
      name: "facebookexternalhit",
      operator: "Meta",
      purpose: "social_preview",
    });
    expect(classifyUA("python-requests/2.31.0")).toMatchObject({
      name: "python-requests",
      operator: null,
      purpose: "scripted",
    });
  });

  it("leaves identity null for a bot matched only by a generic upstream pattern", () => {
    // The vendored isbot list is intentionally un-annotated: a hit on "crawl"
    // or "spider" is a bot without a name, and inventing one from the regex
    // would be worse than admitting we do not know.
    const cls = classifyUA("Mozilla/5.0 (compatible; SomeUnknownCrawler/3.1)");
    expect(cls.isBot).toBe(true);
    expect(cls.name).toBeNull();
    expect(cls.operator).toBeNull();
    expect(cls.purpose).toBeNull();
  });

  it("returns null identity for a non-bot", () => {
    expect(classifyUA("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36")).toMatchObject({
      isBot: false,
      name: null,
      operator: null,
      purpose: null,
    });
  });

  it("isBotUA boolean shorthand agrees with classifyUA", () => {
    expect(isBotUA("Googlebot/2.1")).toBe(true);
    expect(isBotUA("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36")).toBe(false);
  });
});

describe("generic substrings on a browser user agent", () => {
  const webview = (suffix: string) =>
    `Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.7390.122 Mobile Safari/537.36 ${suffix}`;

  it("only corroborates when an in-app browser carries its host app's name", () => {
    // A news app's readers, an ad network's in-app WebView: the upstream "news"
    // substring matches the app, and says nothing about the visitor.
    for (const ua of [
      webview("NewsArticle/9.8.7 JsSdk/2.0 NetType/4G"),
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BaoMoiNews/25.10.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 DailyNewsDesktop/3.2",
    ]) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.supportingOnly, ua).toBe(true);
      expect(isBotUA(ua), ua).toBe(false);
    }
  });

  it("still convicts a crawler that borrows a browser frame and names itself", () => {
    for (const ua of [
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1 (compatible; Baiduspider-render/2.0; +http://www.baidu.com/search/spider.html)",
      "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
      webview("NewsCrawler/1.0"),
    ]) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.supportingOnly, ua).toBe(false);
    }
  });

  it("does not read a handset's name as a crawler's", () => {
    // Upstream's own `bot` pattern excludes "cubot"; the demotion must too.
    const cls = classifyUA(
      "Mozilla/5.0 (Linux; Android 13; CUBOT X70 Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.7390.122 Mobile Safari/537.36 DailyNews/4.1"
    );

    expect(cls.isBot).toBe(true);
    expect(cls.supportingOnly).toBe(true);
  });

  it("still convicts a distinct product identifier inside a browser frame", () => {
    for (const ua of [
      webview("HTTrack/3.49"),
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 DeuSu/5.0.2",
      webview("SiteScraper/2.0"),
    ]) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.supportingOnly, ua).toBe(false);
    }
  });

  it("only demotes patterns that are still in the vendored list", () => {
    const vendored = new Set(ALL_BOT_PATTERNS.filter(p => p.name === undefined).map(p => p.pattern));
    for (const pattern of AMBIGUOUS_ON_BROWSER) {
      expect(vendored.has(pattern), pattern).toBe(true);
    }
  });

  it("still convicts on a specific pattern hiding behind a generic one", () => {
    const cls = classifyUA(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36 NewsReader/1.0"
    );

    expect(cls.supportingOnly).toBe(false);
    expect(cls.category).toBe("headless");
  });

  it("still convicts a generic substring outside a browser frame", () => {
    for (const ua of ["NewsFetcher/2.1", "my-news-tool", "Mozilla/5.0 (compatible; NewsAggregator/1.0)"]) {
      const cls = classifyUA(ua);
      expect(cls.isBot, ua).toBe(true);
      expect(cls.supportingOnly, ua).toBe(false);
    }
  });

  it("does not mistake the DuckDuckGo browser for DuckDuckBot", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 DuckDuckGo/7 Safari/605.1.15",
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile DuckDuckGo/5 Safari/537.36",
    ]) {
      expect(classifyUA(ua).isBot, ua).toBe(false);
    }

    expect(classifyUA("DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)")).toMatchObject({
      isBot: true,
      supportingOnly: false,
      name: "DuckDuckBot",
    });
    expect(classifyUA("DuckDuckGo-Favicons-Bot/1.0")).toMatchObject({ isBot: true, supportingOnly: false });
  });
});
