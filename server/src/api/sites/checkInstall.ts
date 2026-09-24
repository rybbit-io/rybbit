import { FastifyReply, FastifyRequest } from "fastify";
import { verifyExpiringPayload } from "../../lib/signedToken.js";
import { fetchHomepage, hasRybbitScript } from "../../services/lifecycleEmails/platformDetect.js";

/**
 * Public endpoint linked from the "still nothing from your site" lifecycle
 * email. Fetches the domain's homepage server-side and reports whether the
 * tracking snippet for *this* site is present. The signed, expiring
 * (siteId, domain) pair keeps it from being used as an open fetch proxy, and
 * a small per-IP limiter keeps a leaked link from being a probe loop.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const isRateLimited = (ip: string): boolean => {
  const nowMs = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < nowMs) {
    // Opportunistic cleanup so the map doesn't grow unbounded
    if (rateBuckets.size > 10_000) {
      for (const [key, value] of rateBuckets) {
        if (value.resetAt < nowMs) rateBuckets.delete(key);
      }
    }
    rateBuckets.set(ip, { count: 1, resetAt: nowMs + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
};

export const checkInstall = async (
  request: FastifyRequest<{ Querystring: { siteId?: string; domain?: string; exp?: string; sig?: string } }>,
  reply: FastifyReply
) => {
  const { siteId, domain, exp, sig } = request.query;
  const siteIdNum = Number(siteId);

  if (
    !domain ||
    !sig ||
    !exp ||
    !Number.isInteger(siteIdNum) ||
    !verifyExpiringPayload(`check-install:${siteIdNum}:${domain}`, exp, sig)
  ) {
    return reply.status(400).type("text/html").send(page("Invalid link", "This install-check link is invalid or expired."));
  }

  if (isRateLimited(request.ip)) {
    return reply
      .status(429)
      .type("text/html")
      .send(page("Slow down", "Too many checks in a row - wait a minute and try again."));
  }

  const html = await fetchHomepage(domain);

  if (html === null) {
    return reply
      .type("text/html")
      .send(
        page(
          `Couldn't reach ${escapeHtml(domain)}`,
          `We couldn't fetch your homepage just now. If the site is up, it may be blocking automated requests - check the page source manually for the Rybbit snippet, or reply to the email and we'll help.`
        )
      );
  }

  if (hasRybbitScript(html, siteIdNum)) {
    return reply
      .type("text/html")
      .send(
        page(
          `The snippet is installed on ${escapeHtml(domain)}`,
          `We found the Rybbit script with your site ID on your homepage. If data still isn't showing up after a few minutes, an adblocker may be blocking your own test visits - try a private window, or see <a href="https://rybbit.com/docs/script-troubleshooting">the troubleshooting guide</a>.`
        )
      );
  }

  return reply
    .type("text/html")
    .send(
      page(
        `The snippet isn't on ${escapeHtml(domain)} yet`,
        `We fetched your homepage and couldn't find the Rybbit script with your site ID in it. Add the snippet to the &lt;head&gt; of every page and redeploy - see <a href="https://rybbit.com/docs/script">the install guide</a>. If a snippet is there but for a different site ID, data is being sent to the wrong site.`
      )
    );
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const page = (title: string, body: string) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Rybbit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0e1013; color: #e5e7eb; display: flex; justify-content: center; padding: 80px 24px; margin: 0; }
    main { max-width: 480px; }
    h1 { font-size: 20px; color: #fff; }
    p { line-height: 1.6; color: #9ca3af; }
    a { color: #10b981; }
  </style>
</head>
<body><main><h1>${title}</h1><p>${body}</p></main></body>
</html>`;
