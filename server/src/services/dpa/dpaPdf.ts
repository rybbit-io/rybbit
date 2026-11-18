import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { htmlToPdf } from "../../lib/htmlToPdf.js";
import { DpaDocument, type DpaDocumentProps } from "./DpaDocument.js";

const require = createRequire(import.meta.url);

// Dancing Script (SIL OFL 1.1) for the typed signatures, inlined so the render
// never reaches out to a font CDN. Ranges from @fontsource's unicode.json.
const FONT_SUBSETS = [
  {
    file: "latin",
    range:
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  },
  {
    file: "latin-ext",
    range:
      "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  },
];

let fontFaceCss: string | undefined;

function signatureFontCss(): string {
  fontFaceCss ??= FONT_SUBSETS.map(({ file, range }) => {
    const path = require.resolve(`@fontsource/dancing-script/files/dancing-script-${file}-400-normal.woff2`);
    const data = readFileSync(path).toString("base64");
    return `@font-face { font-family: 'DPA Signature'; font-style: normal; font-weight: 400; src: url(data:font/woff2;base64,${data}) format('woff2'); unicode-range: ${range}; }`;
  }).join("\n");
  return fontFaceCss;
}

export function renderDpaHtml(props: DpaDocumentProps): string {
  const body = renderToStaticMarkup(DpaDocument(props));
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Data Processing Agreement</title><style>${signatureFontCss()}</style></head><body>${body}</body></html>`;
}

export async function renderDpaPdf(props: DpaDocumentProps): Promise<Buffer> {
  return htmlToPdf(renderDpaHtml(props), {
    margin: { top: "18mm", right: "18mm", bottom: "20mm", left: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;padding:0 18mm;font-family:Helvetica,Arial,sans-serif;font-size:7pt;color:#777;display:flex;justify-content:space-between;"><span>Rybbit Data Processing Agreement · ${props.agreementId}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
}

/** An ASCII-only file name, safe in a Content-Disposition header: rybbit-dpa-acme-gmbh-2026-11-17.pdf */
export function dpaPdfFilename(companyName: string, signedAt: string): string {
  const slug = companyName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `rybbit-dpa-${slug || "agreement"}-${signedAt.slice(0, 10)}.pdf`;
}
