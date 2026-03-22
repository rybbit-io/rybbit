import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import puppeteer from "puppeteer";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";

interface VerifyScriptParams {
  Params: {
    siteId: string;
  };
}

export interface VerifyScriptResponse {
  scriptTagFound: boolean;
  scriptExecuted: boolean;
  siteIdMatch: boolean;
  issues: string[];
}

export async function verifyScript(
  request: FastifyRequest<VerifyScriptParams>,
  reply: FastifyReply
) {
  const { siteId } = request.params;
  const numericSiteId = Number(siteId);

  try {
    const site = await db.query.sites.findFirst({
      where: isNaN(numericSiteId)
        ? eq(sites.id, siteId)
        : eq(sites.siteId, numericSiteId),
    });

    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    const domain = site.domain;
    const url = domain.startsWith("http") ? domain : `https://${domain}`;

    const issues: string[] = [];
    let scriptTagFound = false;
    let scriptExecuted = false;
    let siteIdMatch = false;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set a reasonable timeout and user agent
      page.setDefaultNavigationTimeout(15000);
      await page.setUserAgent({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
      } catch (navError: any) {
        issues.push(
          `Could not load ${url}: ${navError.message || "Navigation failed"}`
        );
        return reply.status(200).send({
          scriptTagFound: false,
          scriptExecuted: false,
          siteIdMatch: false,
          issues,
        } satisfies VerifyScriptResponse);
      }

      // Check for script tag in the DOM
      const scriptCheck = await page.evaluate((expectedSiteId: string) => {
        const scripts = document.querySelectorAll("script");
        let found = false;
        let siteIdCorrect = false;
        let foundSiteId: string | null = null;

        for (const script of scripts) {
          const src = script.getAttribute("src") || script.getAttribute("data-src") || "";
          if (src.includes("script.js") || src.includes("rybbit")) {
            found = true;
            foundSiteId = script.getAttribute("data-site-id");
            if (foundSiteId === expectedSiteId) {
              siteIdCorrect = true;
            }
            break;
          }
        }

        return { found, siteIdCorrect, foundSiteId };
      }, site.id!);

      scriptTagFound = scriptCheck.found;
      siteIdMatch = scriptCheck.siteIdCorrect;

      if (!scriptTagFound) {
        issues.push(
          "Rybbit script tag not found in the page HTML. Make sure the script is placed in the <head> tag."
        );
      } else if (!siteIdMatch) {
        issues.push(
          `Script tag found but data-site-id is "${scriptCheck.foundSiteId}" instead of "${site.id}".`
        );
      }

      // Wait a moment for the script to execute, then check for the global
      await new Promise((resolve) => setTimeout(resolve, 2000));

      scriptExecuted = await page.evaluate(() => {
        return typeof (window as any).rybbit !== "undefined";
      });

      if (scriptTagFound && !scriptExecuted) {
        issues.push(
          "Script tag is present but the rybbit object was not found on window. The script may be blocked by a Content Security Policy, ad blocker, or the src URL may be incorrect."
        );
      }

      return reply.status(200).send({
        scriptTagFound,
        scriptExecuted,
        siteIdMatch,
        issues,
      } satisfies VerifyScriptResponse);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error("Error verifying script:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
