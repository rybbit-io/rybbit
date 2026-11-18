import { DPA_ANNEXES, DPA_SECTIONS, DPA_VERSION } from "@rybbit/shared";
import { describe, expect, it } from "vitest";
import { dpaPdfFilename, renderDpaHtml } from "./dpaPdf.js";

const party = {
  legalName: "Rybbit Test Entity",
  address: "1 Test Street\nTest City",
  signatoryName: "Sam Signatory",
  signatoryTitle: "Founder",
};

const props = {
  agreementId: "agreement-1",
  details: {
    companyName: "Acme <GmbH>",
    companyAddress: "Musterstraße 12\n10115 Berlin",
    signerName: "Jördis Example",
    signerTitle: "Managing Director",
    signerEmail: "legal@acme.example",
  },
  signedAt: "2026-11-17T10:42:05.000Z",
  signerIp: "203.0.113.7",
  accountEmail: null,
  party,
};

describe("renderDpaHtml", () => {
  const html = renderDpaHtml(props).replace(/<!-- -->/g, "");

  it("prints both parties, both signatures and the signature record", () => {
    expect(html).toContain("Rybbit Test Entity");
    expect(html).toContain("Sam Signatory");
    expect(html).toContain("Jördis Example");
    expect(html).toContain("Managing Director");
    expect(html).toContain(`Version ${DPA_VERSION}`);
    expect(html).toContain("2026-11-17 10:42:05 UTC");
    expect(html).toContain("203.0.113.7");
  });

  it("includes every clause of the shared DPA text", () => {
    for (const section of [...DPA_SECTIONS, ...DPA_ANNEXES]) {
      expect(html).toContain(section.title.replace(/'/g, "&#x27;"));
    }
  });

  it("escapes what the customer typed", () => {
    expect(html).toContain("Acme &lt;GmbH&gt;");
    expect(html).not.toContain("Acme <GmbH>");
  });

  it("leaves out the account line when the signer signed with their own address", () => {
    expect(html).not.toContain("Rybbit account");
    const other = renderDpaHtml({ ...props, accountEmail: "admin@acme.example" });
    expect(other).toContain("admin@acme.example");
  });
});

describe("dpaPdfFilename", () => {
  it("builds an ASCII slug from the company name and the signing date", () => {
    expect(dpaPdfFilename("Acme Analytics GmbH", "2026-11-17T10:42:05.000Z")).toBe(
      "rybbit-dpa-acme-analytics-gmbh-2026-11-17.pdf"
    );
    expect(dpaPdfFilename('Müller & "Söhne"', "2026-11-17 10:42:05")).toBe("rybbit-dpa-muller-sohne-2026-11-17.pdf");
  });

  it("falls back when nothing ASCII is left", () => {
    expect(dpaPdfFilename("株式会社", "2026-11-17T00:00:00.000Z")).toBe("rybbit-dpa-agreement-2026-11-17.pdf");
  });
});
