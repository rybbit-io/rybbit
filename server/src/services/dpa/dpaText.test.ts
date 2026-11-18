import { readFileSync } from "node:fs";
import { DPA_ANNEXES, DPA_PREAMBLE, DPA_SECTIONS, RYBBIT_DPA_PARTY } from "@rybbit/shared";
import { describe, expect, it } from "vitest";

const strings = (value: unknown): string[] =>
  typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];

const repoFile = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

describe("DPA text", () => {
  // rybbit.com/dpa sits outside the pnpm workspace, so it renders its own copy.
  it("is the same on rybbit.com/dpa as in the agreement customers sign", () => {
    expect(repoFile("docs/src/lib/dpa.ts")).toBe(repoFile("shared/src/dpa.ts"));
  });

  it("has no [placeholders] left for customers to sign", () => {
    const text = strings([DPA_PREAMBLE, RYBBIT_DPA_PARTY, DPA_SECTIONS, DPA_ANNEXES]);
    expect(text.filter(value => /\[[^\]]*\]/.test(value))).toEqual([]);
  });
});
