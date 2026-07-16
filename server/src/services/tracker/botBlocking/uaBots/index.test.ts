import { describe, expect, it } from "vitest";
import { classifyUA, isBotUA } from "./index.js";

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

  it("isBotUA boolean shorthand agrees with classifyUA", () => {
    expect(isBotUA("Googlebot/2.1")).toBe(true);
    expect(isBotUA("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36")).toBe(false);
  });
});
