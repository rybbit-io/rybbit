import { readFileSync } from "node:fs";
import { DPA_ANNEXES, dpaPlaceholders, isDpaCountersignatureReady, type DpaSection } from "@rybbit/shared";
import { describe, expect, it } from "vitest";

const repoFile = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

const party = {
  legalName: "Rybbit Test Entity",
  address: "1 Test Street",
  signatoryName: "Sam Signatory",
  signatoryTitle: "CEO",
};
const sections: DpaSection[] = [{ title: "1. Test", blocks: [{ type: "p", text: "Backups expire within 30 days." }] }];

describe("DPA text", () => {
  // rybbit.com/dpa sits outside the pnpm workspace, so it renders its own copy.
  it("is the same on rybbit.com/dpa as in the agreement customers sign", () => {
    expect(repoFile("docs/src/lib/dpa.ts")).toBe(repoFile("shared/src/dpa.ts"));
  });

  it("lists every Annex III sub-processor on rybbit.com/subprocessors", () => {
    const page = repoFile("docs/src/app/[locale]/(home)/subprocessors/page.tsx");
    const annex = DPA_ANNEXES.find(section => section.title.startsWith("Annex III"));
    const names = annex!.blocks.flatMap(block =>
      block.type === "ul" ? block.items.map(item => (typeof item === "string" ? item : item.term)) : []
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(page).toContain(`name: "${name.split(/[ ,(]/)[0]}`);
    }
  });
});

describe("isDpaCountersignatureReady", () => {
  it("allows signing once Rybbit's details and the text are complete", () => {
    expect(isDpaCountersignatureReady(party, sections)).toBe(true);
  });

  it("stays off while the text has a bracketed placeholder", () => {
    const withGap: DpaSection[] = [{ title: "1. Test", blocks: [{ type: "ul", items: ["Within [N] days."] }] }];
    expect(dpaPlaceholders(party, withGap)).toEqual(["[N]"]);
    expect(isDpaCountersignatureReady(party, withGap)).toBe(false);
  });

  it("stays off while Rybbit's details are blank or placeholders", () => {
    expect(isDpaCountersignatureReady({ ...party, signatoryTitle: " " }, sections)).toBe(false);
    expect(isDpaCountersignatureReady({ ...party, legalName: "[Rybbit legal entity]" }, sections)).toBe(false);
  });
});
