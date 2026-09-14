import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const nextBin = join(docsRoot, "node_modules/next/dist/bin/next");

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise(resolve => server.close(resolve));
  return address.port;
}

async function waitForServer(origin, child) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Next server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${origin}/robots.txt`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for the Next production server.");
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

const port = await availablePort();
const origin = `http://localhost:${port}`;
let victimHits = 0;
const victim = createServer((_request, response) => {
  victimHits += 1;
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end("<main><h1>Internal secret</h1><p>Do not expose this response.</p></main>");
});
await new Promise((resolve, reject) => victim.listen(0, "127.0.0.1", resolve).once("error", reject));
const victimAddress = victim.address();
assert.ok(victimAddress && typeof victimAddress === "object");

const child = spawn(process.execPath, [nextBin, "start", "--hostname", "localhost", "--port", String(port)], {
  cwd: docsRoot,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
child.stdout.on("data", chunk => (serverOutput += chunk));
child.stderr.on("data", chunk => (serverOutput += chunk));

try {
  await waitForServer(origin, child);

  const html = await fetch(`${origin}/`, { headers: { Accept: "text/html" }, redirect: "manual" });
  assert.equal(html.status, 200);
  const htmlVary = html.headers.get("vary") ?? "";
  const htmlCacheControl = html.headers.get("cache-control") ?? "";
  const htmlBody = await html.text();
  assert.ok(htmlBody.length >= 500, "The server-rendered homepage must contain substantial raw HTML.");
  assert.match(htmlBody, /<h1(?:\s|>)/i);
  assert.match(htmlBody, /<h2(?:\s|>)/i);
  assert.match(htmlBody, /<h3(?:\s|>)/i);
  assert.ok(
    /(?:^|,)\s*Accept\s*(?:,|$)/i.test(htmlVary) || /(?:private|no-store)/i.test(htmlCacheControl),
    "The local HTML variant must either vary on Accept or be unavailable to shared caches."
  );

  const vercelConfig = JSON.parse(readFileSync(join(docsRoot, "vercel.json"), "utf8"));
  const deployedVary = vercelConfig.headers?.[0]?.headers?.find(header => header.key.toLowerCase() === "vary")?.value;
  for (const token of [
    "Accept",
    "Accept-Encoding",
    "RSC",
    "Next-Router-State-Tree",
    "Next-Router-Prefetch",
    "Next-Router-Segment-Prefetch",
  ]) {
    assert.match(deployedVary ?? "", new RegExp(`(?:^|,)\\s*${token}\\s*(?:,|$)`, "i"));
  }

  const markdown = await fetch(`${origin}/`, { headers: { Accept: "text/markdown" } });
  assert.equal(markdown.status, 200);
  assert.match(markdown.headers.get("content-type") ?? "", /^text\/markdown/);
  assert.match(markdown.headers.get("vary") ?? "", /(?:^|,)\s*Accept\s*(?:,|$)/i);
  assert.match(await markdown.text(), /^# Rybbit/m);

  const markdownHead = await fetch(`${origin}/`, { method: "HEAD", headers: { Accept: "text/markdown" } });
  assert.equal(markdownHead.status, 200);
  assert.match(markdownHead.headers.get("content-type") ?? "", /^text\/markdown/);
  assert.equal(await markdownHead.text(), "");

  const docsMarkdown = await fetch(`${origin}/docs/api/getting-started`, {
    headers: { Accept: "text/markdown" },
  });
  assert.equal(docsMarkdown.status, 200);
  assert.match(docsMarkdown.headers.get("content-type") ?? "", /^text\/markdown/);
  assert.match(await docsMarkdown.text(), /^# /m);

  const unacceptable = await fetch(`${origin}/`, { headers: { Accept: "application/pdf" } });
  assert.equal(unacceptable.status, 406);
  assert.match(unacceptable.headers.get("vary") ?? "", /(?:^|,)\s*Accept\s*(?:,|$)/i);

  const hostilePath = `//127.0.0.1:${victimAddress.port}/internal`;
  const ssrf = await fetch(`${origin}/api/agent/markdown?path=${encodeURIComponent(hostilePath)}`);
  assert.equal(ssrf.status, 400);
  assert.match(ssrf.headers.get("content-type") ?? "", /^application\/json/);
  assert.equal((await ssrf.json()).code, "INVALID_MARKDOWN_PATH");
  assert.equal(victimHits, 0);

  const newline = await fetch(`${origin}/api/agent/markdown?path=${encodeURIComponent("/bad\npath")}`);
  assert.equal(newline.status, 400);
  assert.equal((await newline.json()).code, "INVALID_MARKDOWN_PATH");

  const recursive = await fetch(
    `${origin}/api/agent/markdown?path=${encodeURIComponent("/api/agent/markdown")}`
  );
  assert.equal(recursive.status, 400);
  assert.equal((await recursive.json()).code, "INVALID_MARKDOWN_PATH");

  const redirect = await fetch(`${origin}/tools/instagram-logo-generator`, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });
  assert.equal(redirect.status, 308);
  assert.equal(new URL(redirect.headers.get("location"), origin).pathname, "/tools");

  const missing = await fetch(`${origin}/agent-http-test-missing`, {
    headers: { Accept: "text/markdown" },
  });
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /^# Page not found/m);

  const htmlMissing = await fetch(`${origin}/agent-http-test-missing`, {
    headers: { Accept: "text/html" },
    redirect: "manual",
  });
  assert.equal(htmlMissing.status, 404);
  assert.match(await htmlMissing.text(), /Page not found/);

  const openapi = await fetch(`${origin}/openapi.json`);
  assert.equal(openapi.status, 200);
  assert.match(openapi.headers.get("content-type") ?? "", /^application\/json/);
  const openapiDocument = await openapi.json();
  assert.equal(openapiDocument.openapi, "3.1.1");

  const openapiAlias = await fetch(`${origin}/api/openapi.json`);
  assert.equal(openapiAlias.status, 200);
  assert.deepEqual(await openapiAlias.json(), openapiDocument);

  const openapiHead = await fetch(`${origin}/openapi.json`, { method: "HEAD" });
  assert.equal(openapiHead.status, 200);
  assert.match(openapiHead.headers.get("content-type") ?? "", /^application\/json/);
  assert.equal(await openapiHead.text(), "");

  const llms = await fetch(`${origin}/llms.txt`);
  assert.equal(llms.status, 200);
  assert.match(llms.headers.get("content-type") ?? "", /^text\/plain/);
  assert.match(await llms.text(), /OpenAPI specification/);

  const llmsFull = await fetch(`${origin}/llms-full.txt`);
  assert.equal(llmsFull.status, 200);
  assert.match(llmsFull.headers.get("content-type") ?? "", /^text\/plain/);

  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get("content-type") ?? "", /xml/);

  const robots = await fetch(`${origin}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Allow: \/api\/openapi\.json/);

  const apiMissing = await fetch(`${origin}/api/agent-http-test-missing`);
  assert.equal(apiMissing.status, 404);
  assert.equal((await apiMissing.json()).code, "API_ROUTE_NOT_FOUND");

  console.log("Agent HTTP integration checks passed.");
} catch (error) {
  if (serverOutput) console.error(serverOutput);
  throw error;
} finally {
  await stop(child);
  await new Promise(resolve => victim.close(resolve));
}
