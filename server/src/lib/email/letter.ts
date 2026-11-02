/**
 * A letter from Bill: the welcome and lifecycle emails. Content is written once
 * as blocks and rendered twice, as Ledger HTML (LetterEmail.tsx) and as the
 * plain-text part (letterText), so the two can't drift apart.
 */

export interface LetterRow {
  label: string;
  value: string;
  /** Links the value; the text part prints the URL instead. */
  href?: string;
  strong?: boolean;
}

export type LetterBlock =
  | { type: "p"; text: string }
  | { type: "note"; text: string }
  | { type: "rows"; rows: LetterRow[] }
  | { type: "steps"; steps: { title: string; detail: string }[] }
  | { type: "stats"; stats: { label: string; value: string }[] }
  | { type: "code"; code: string }
  /** One site's tracking script in a multi-site email. */
  | { type: "site"; domain: string; code: string; guide?: { label: string; url: string } }
  | { type: "button"; label: string; href: string; secondary?: { label: string; href: string } };

export interface Letter {
  subject: string;
  preview: string;
  greeting: string;
  blocks: LetterBlock[];
}

export const greeting = (name?: string | null) => {
  // Email-signup users have their email prefix stored as their name - don't greet with that
  const clean = name && !name.includes("@") ? name.split(" ")[0] : "";
  return clean ? `Hi ${clean},` : "Hi,";
};

export const SIGNOFF = "Bill\nFounder, Rybbit";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const blockText = (block: LetterBlock): string => {
  switch (block.type) {
    case "p":
    case "note":
      return block.text;
    case "rows":
      return block.rows.map(row => `${row.label}: ${row.href ?? row.value}`).join("\n");
    case "steps":
      return block.steps.map((step, i) => `${i + 1}. ${step.title} (${lowerFirst(step.detail)})`).join("\n");
    case "stats":
      return block.stats.map(stat => `${stat.label}: ${stat.value}`).join("\n");
    case "code":
      return block.code;
    case "site":
      return `${block.domain}${block.guide ? ` (${block.guide.label} guide: ${block.guide.url})` : ""}\n${block.code}`;
    case "button":
      return [`${block.label}: ${block.href}`, block.secondary && `${block.secondary.label}: ${block.secondary.href}`]
        .filter(Boolean)
        .join("\n");
  }
};

export const letterText = (letter: Letter): string =>
  [letter.greeting, ...letter.blocks.map(blockText), SIGNOFF].join("\n\n");
