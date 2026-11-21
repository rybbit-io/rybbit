import { renderToStaticMarkup } from "react-dom/server";
import { htmlToPdf } from "../../lib/htmlToPdf.js";
import { DpaDocument, type DpaDocumentProps } from "./DpaDocument.js";

export function renderDpaHtml(props: DpaDocumentProps): string {
  const body = renderToStaticMarkup(DpaDocument(props));
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Data Processing Agreement</title></head><body>${body}</body></html>`;
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
