import puppeteer, { type PDFOptions } from "puppeteer";

/**
 * Prints an HTML document to PDF in a headless Chromium, once the page's
 * network has settled and its web fonts have loaded.
 */
export async function htmlToPdf(html: string, options: PDFOptions = {}): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({ format: "A4", printBackground: true, ...options });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
