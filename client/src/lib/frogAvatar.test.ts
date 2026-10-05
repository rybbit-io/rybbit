import { colors } from "unique-names-generator";
import { describe, expect, it } from "vitest";
import { generateName } from "../components/Avatar";
import { FROG_COLOR_WORDS, frogAvatarMarkup, frogColorWord } from "./frogAvatar";

// A spread of id shapes: bare hashes, emails, uuid-like strings.
const ids = Array.from({ length: 2000 }, (_, i) => {
  const hex = (Math.imul(i + 1, 2654435761) >>> 0).toString(16);
  return [`${hex}${hex.slice(0, 4)}`, `user-${i}@example.com`, `${hex}-${i}-4c1a-9b2e-${i.toString(36)}`][i % 3];
});

describe("frogColorWord", () => {
  it("lists the name generator's colour words in the generator's order", () => {
    expect(FROG_COLOR_WORDS).toEqual(colors);
  });

  it("picks the colour word that starts the visitor's generated name", () => {
    for (const id of ids) {
      expect(frogColorWord(id)).toBe(generateName(id).split(" ")[0].toLowerCase());
    }
  });
});

describe("frogAvatarMarkup", () => {
  it("draws the same frog for the same id", () => {
    expect(frogAvatarMarkup("a1d7b800719f", 20)).toBe(frogAvatarMarkup("a1d7b800719f", 20));
  });

  it("references nothing by id, so repeated or hidden copies cannot break each other", () => {
    for (const id of ids.slice(0, 500)) {
      const markup = frogAvatarMarkup(id, 48);
      expect(markup).not.toMatch(/\sid=/);
      expect(markup).not.toContain("url(");
    }
  });

  it("never echoes the id into the markup", () => {
    expect(frogAvatarMarkup('"><script>alert(1)</script>', 20)).not.toContain("script");
  });
});
