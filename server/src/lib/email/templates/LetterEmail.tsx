import * as React from "react";
import type { Letter, LetterBlock } from "../letter.js";
import {
  color,
  LedgerLayout,
  Note,
  P,
  PrimaryButton,
  Rows,
  Signoff,
  Snippet,
  StatGrid,
  Steps,
  TextLink,
  type FooterLink,
} from "./ledger.js";

interface LetterEmailProps {
  letter: Letter;
  footer?: FooterLink[];
}

/** Space above a block depends on what it follows: prose runs tight, everything else breathes. */
const gapBefore = (block: LetterBlock, previous: LetterBlock | undefined): number => {
  const afterProse = previous === undefined || previous.type === "p";
  switch (block.type) {
    case "p":
      return afterProse ? 16 : 28;
    case "code":
      return afterProse ? 16 : 12;
    case "site":
      return 24;
    case "note":
      return 24;
    case "button":
      return 32;
    default:
      return 28;
  }
};

const Block = ({ block, top }: { block: LetterBlock; top: number }) => {
  switch (block.type) {
    case "p":
      return <P top={top}>{block.text}</P>;
    case "note":
      return <Note top={top}>{block.text}</Note>;
    case "rows":
      return (
        <Rows
          top={top}
          rows={block.rows.map(row => ({
            label: row.label,
            strong: row.strong,
            value: row.href ? <TextLink href={row.href}>{row.value}</TextLink> : row.value,
          }))}
        />
      );
    case "steps":
      return <Steps top={top} steps={block.steps} />;
    case "stats":
      return <StatGrid top={top} stats={block.stats} />;
    case "code":
      return <Snippet top={top} code={block.code} />;
    case "site":
      return (
        <div style={{ marginTop: top }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: "20px", fontWeight: 600, color: color.text }}>
            {block.domain}
            {block.guide && (
              <span style={{ fontWeight: 400, color: color.muted }}>
                {" · "}
                <TextLink href={block.guide.url}>{block.guide.label} guide</TextLink>
              </span>
            )}
          </p>
          <Snippet top={8} code={block.code} />
        </div>
      );
    case "button":
      return <PrimaryButton top={top} label={block.label} href={block.href} secondary={block.secondary} />;
  }
};

export const LetterEmail = ({ letter, footer }: LetterEmailProps) => (
  <LedgerLayout preview={letter.preview} footer={footer}>
    <P top={36}>{letter.greeting}</P>
    {letter.blocks.map((block, i) => (
      <Block key={i} block={block} top={gapBefore(block, letter.blocks[i - 1])} />
    ))}
    <Signoff />
  </LedgerLayout>
);
