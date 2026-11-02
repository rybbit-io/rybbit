import { Body, Button, Head, Html, Img, Link, Preview } from "@react-email/components";
import * as React from "react";

/**
 * Ledger: the shared look of every Rybbit email. A white page, a 560px column,
 * a sentence heading, facts as hairline label/value rows and one emerald
 * button. Layout is table-based and every style is inline, because Gmail and
 * Outlook drop flexbox, grid and most of <head>.
 */

export const color = {
  page: "#ffffff",
  text: "#0a0a0a",
  body: "#262626",
  muted: "#666666",
  rule: "#e6e6e6",
  ruleSoft: "#efefef",
  fill: "#fafafa",
  track: "#f0f0f0",
  data: "#99aaff",
  dataMid: "#c2caff",
  dataLight: "#e3e7ff",
  previous: "#dedede",
  axis: "#d4d4d4",
  up: "#047857",
  down: "#b91c1c",
  action: "#047857",
  warning: "#eab308",
  danger: "#dc2626",
  dangerText: "#b91c1c",
  dangerFill: "#fee2e2",
  linkUnderline: "#bdbdbd",
};

export const fontFamily = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const monoFamily = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

// A PNG, not the SVG logo: Gmail and Outlook don't render SVG images.
const LOGO_URL = "https://app.rybbit.io/rybbit/email-logo.png";

export const HELP_URL = "https://rybbit.com/docs";

// Phones get a narrower stat grid and drop the share bars so labels keep their room.
const responsiveCss = `
@media only screen and (max-width: 480px) {
  .ledger-bar { display: none !important; }
  .ledger-stat { padding: 12px 10px !important; }
  .ledger-label { width: 112px !important; }
}
`;

export interface FooterLink {
  label: string;
  href: string;
}

interface LedgerLayoutProps {
  preview: string;
  footer?: FooterLink[];
  children: React.ReactNode;
}

const table = { cellPadding: 0, cellSpacing: 0, border: 0, role: "presentation" } as const;

export const LedgerLayout = ({ preview, footer = [], children }: LedgerLayoutProps) => (
  <Html lang="en">
    <Head>
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light" />
      <style>{responsiveCss}</style>
    </Head>
    <Preview>{preview}</Preview>
    <Body style={{ margin: 0, padding: 0, backgroundColor: color.page }}>
      <table {...table} width="100%" style={{ backgroundColor: color.page }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: "0 20px" }}>
              <table {...table} width="560" style={{ width: "100%", maxWidth: 560 }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "40px 0 48px",
                        fontFamily,
                        color: color.text,
                        textAlign: "left",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <Img
                        src={LOGO_URL}
                        alt="Rybbit"
                        width="100"
                        height="20"
                        style={{ display: "block", border: 0 }}
                      />
                      {children}
                      {footer.length > 0 && <Footer links={footer} />}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </Body>
  </Html>
);

const Footer = ({ links }: { links: FooterLink[] }) => (
  <div
    style={{
      marginTop: 48,
      paddingTop: 20,
      borderTop: `1px solid ${color.rule}`,
      fontSize: 12,
      lineHeight: "18px",
      color: color.muted,
    }}
  >
    <p style={{ margin: 0 }}>
      {links.map((link, i) => (
        <React.Fragment key={link.href}>
          {i > 0 && <span style={{ padding: "0 8px" }}>·</span>}
          <Link href={link.href} style={{ color: color.muted, textDecoration: "underline" }}>
            {link.label}
          </Link>
        </React.Fragment>
      ))}
    </p>
  </div>
);

export const H1 = ({ children }: { children: React.ReactNode }) => (
  <h1
    style={{
      margin: "36px 0 0",
      fontSize: 24,
      lineHeight: "30px",
      fontWeight: 600,
      letterSpacing: "-0.015em",
      color: color.text,
    }}
  >
    {children}
  </h1>
);

export const H2 = ({ children, top = 40 }: { children: React.ReactNode; top?: number }) => (
  <h2
    style={{
      margin: `${top}px 0 0`,
      fontSize: 15,
      lineHeight: "20px",
      fontWeight: 600,
      letterSpacing: "-0.005em",
      color: color.text,
    }}
  >
    {children}
  </h2>
);

export const P = ({ children, top = 12 }: { children: React.ReactNode; top?: number }) => (
  <p style={{ margin: `${top}px 0 0`, fontSize: 15, lineHeight: "24px", color: color.body }}>{children}</p>
);

export const Note = ({ children, top = 24 }: { children: React.ReactNode; top?: number }) => (
  <p style={{ margin: `${top}px 0 0`, fontSize: 13, lineHeight: "20px", color: color.muted }}>{children}</p>
);

export const Strong = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ fontWeight: 600, color: color.text }}>{children}</strong>
);

export const TextLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    style={{ color: color.text, textDecoration: "underline", textDecorationColor: color.linkUnderline }}
  >
    {children}
  </Link>
);

export interface LedgerRow {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}

/** Facts as label/value rows between hairlines. */
export const Rows = ({ rows, top = 28 }: { rows: LedgerRow[]; top?: number }) => (
  <div style={{ marginTop: top }}>
    <table {...table} width="100%" style={{ borderTop: `1px solid ${color.rule}`, borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(row => (
          <tr key={row.label}>
            <td
              className="ledger-label"
              width="144"
              valign="top"
              style={{
                width: 144,
                padding: "12px 16px 12px 0",
                borderBottom: `1px solid ${color.rule}`,
                fontSize: 14,
                lineHeight: "20px",
                color: color.muted,
                verticalAlign: "top",
              }}
            >
              {row.label}
            </td>
            <td
              valign="top"
              style={{
                padding: "12px 0",
                borderBottom: `1px solid ${color.rule}`,
                fontSize: 14,
                lineHeight: "20px",
                color: color.text,
                fontWeight: row.strong ? 600 : 400,
                verticalAlign: "top",
                wordBreak: "break-word",
              }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export interface Step {
  title: string;
  detail: string;
}

/** A numbered checklist in the same hairline rows. */
export const Steps = ({ steps, top = 28 }: { steps: Step[]; top?: number }) => (
  <div style={{ marginTop: top }}>
    <table {...table} width="100%" style={{ borderTop: `1px solid ${color.rule}`, borderCollapse: "collapse" }}>
      <tbody>
        {steps.map((step, i) => (
          <tr key={step.title}>
            <td
              width="32"
              valign="top"
              style={{
                width: 32,
                padding: "12px 0",
                borderBottom: `1px solid ${color.rule}`,
                fontSize: 14,
                lineHeight: "20px",
                color: color.muted,
                verticalAlign: "top",
              }}
            >
              {i + 1}
            </td>
            <td
              valign="top"
              style={{ padding: "12px 0", borderBottom: `1px solid ${color.rule}`, fontSize: 14, lineHeight: "20px" }}
            >
              <span style={{ display: "block", fontWeight: 500, color: color.text }}>{step.title}</span>
              <span style={{ display: "block", fontSize: 13, color: color.muted }}>{step.detail}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface ButtonRowProps {
  label: string;
  href: string;
  secondary?: { label: string; href: string };
  top?: number;
}

/** The one emerald action, with an optional plain link beside it. */
export const PrimaryButton = ({ label, href, secondary, top = 32 }: ButtonRowProps) => (
  <div style={{ marginTop: top }}>
    <Button
      href={href}
      style={{
        backgroundColor: color.action,
        borderRadius: 4,
        color: "#ffffff",
        fontSize: 15,
        lineHeight: "20px",
        fontWeight: 600,
        textDecoration: "none",
        padding: "12px 20px",
        display: "inline-block",
      }}
    >
      {label}
    </Button>
    {secondary && (
      <Link
        href={secondary.href}
        style={{
          marginLeft: 20,
          fontSize: 14,
          lineHeight: "20px",
          color: color.text,
          textDecoration: "underline",
          textDecorationColor: color.linkUnderline,
        }}
      >
        {secondary.label}
      </Link>
    )}
  </div>
);

/** A one-time code, split in two groups for reading; copying it gives the bare digits. */
export const CodeBox = ({ code }: { code: string }) => {
  const half = code.length === 6 || code.length === 8 ? code.length / 2 : code.length;
  return (
    <div style={{ marginTop: 24 }}>
      <table {...table}>
        <tbody>
          <tr>
            <td
              style={{
                padding: "16px 24px",
                border: `1px solid ${color.rule}`,
                borderRadius: 4,
                backgroundColor: color.fill,
                fontFamily: monoFamily,
                fontSize: 32,
                lineHeight: "40px",
                fontWeight: 600,
                letterSpacing: "0.16em",
                color: color.text,
              }}
            >
              {code.slice(0, half)}
              {half < code.length && <span style={{ paddingLeft: 16 }}>{code.slice(half)}</span>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/** A block of code to copy, such as the tracking script. */
export const Snippet = ({ code, top = 16 }: { code: string; top?: number }) => (
  <div
    style={{
      marginTop: top,
      padding: "14px 16px",
      border: `1px solid ${color.rule}`,
      borderRadius: 4,
      backgroundColor: color.fill,
      fontFamily: monoFamily,
      fontSize: 13,
      lineHeight: "20px",
      color: color.text,
      whiteSpace: "pre-wrap",
      // Wrap at spaces first so an attribute like data-site-id stays whole.
      overflowWrap: "anywhere",
      wordBreak: "break-word",
    }}
  >
    {code}
  </div>
);

/** A long URL printed as a paste-able fallback under a button. */
export const UrlFallback = ({ url }: { url: string }) => (
  <>
    <Note>Or paste this link into your browser:</Note>
    <p
      style={{
        margin: "4px 0 0",
        fontFamily: monoFamily,
        fontSize: 12,
        lineHeight: "18px",
        color: color.muted,
        wordBreak: "break-all",
      }}
    >
      {url}
    </p>
  </>
);

export const Badge = ({ children, tone }: { children: React.ReactNode; tone: "danger" }) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 3,
      fontSize: 12,
      lineHeight: "16px",
      fontWeight: 600,
      backgroundColor: tone === "danger" ? color.dangerFill : color.fill,
      color: tone === "danger" ? color.dangerText : color.text,
    }}
  >
    {children}
  </span>
);

/** A solid bar drawn as a table cell, which Outlook sizes where it ignores div heights. */
export const Bar = ({ width, height, fill }: { width: number; height: number; fill: string }) => (
  <table {...table} width={width} style={{ width }}>
    <tbody>
      <tr>
        <td
          height={height}
          style={{ height, width, backgroundColor: fill, borderRadius: "2px 2px 0 0", fontSize: 0, lineHeight: "0px" }}
        >
          &nbsp;
        </td>
      </tr>
    </tbody>
  </table>
);

interface MeterProps {
  used: string;
  of: string;
  percent: number;
  barColor: string;
  startLabel: string;
  endLabel: string;
  top?: number;
}

/** A usage bar with its scale underneath. */
export const Meter = ({ used, of, percent, barColor, startLabel, endLabel, top = 24 }: MeterProps) => {
  const filled = Math.max(1, Math.min(100, Math.round(percent)));
  return (
    <div style={{ marginTop: top }}>
      <table {...table} width="100%">
        <tbody>
          <tr>
            <td style={{ fontSize: 13, lineHeight: "20px", color: color.muted }}>
              <span style={{ fontWeight: 600, color: color.text }}>{used}</span> of {of}
            </td>
            <td align="right" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: color.text }}>
              {Math.round(percent)}%
            </td>
          </tr>
        </tbody>
      </table>
      <table {...table} width="100%" style={{ marginTop: 8, borderCollapse: "separate" }}>
        <tbody>
          <tr>
            <td
              width={`${filled}%`}
              style={{
                width: `${filled}%`,
                height: 8,
                lineHeight: "8px",
                fontSize: 0,
                backgroundColor: barColor,
                borderRadius: filled === 100 ? 4 : "4px 0 0 4px",
              }}
            >
              &nbsp;
            </td>
            {filled < 100 && (
              <td
                style={{
                  height: 8,
                  lineHeight: "8px",
                  fontSize: 0,
                  backgroundColor: color.track,
                  borderRadius: "0 4px 4px 0",
                }}
              >
                &nbsp;
              </td>
            )}
          </tr>
        </tbody>
      </table>
      <table {...table} width="100%" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ fontSize: 12, lineHeight: "16px", color: color.muted }}>{startLabel}</td>
            <td align="right" style={{ fontSize: 12, lineHeight: "16px", color: color.muted }}>
              {endLabel}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export interface Stat {
  label: string;
  value: string;
  change?: React.ReactNode;
}

/** Headline numbers in a bordered grid, three to a row. */
export const StatGrid = ({ stats, top = 28 }: { stats: Stat[]; top?: number }) => {
  const rows: Stat[][] = [];
  for (let i = 0; i < stats.length; i += 3) rows.push(stats.slice(i, i + 3));
  return (
    <div style={{ marginTop: top }}>
      <table
        {...table}
        width="100%"
        style={{ border: `1px solid ${color.rule}`, borderRadius: 4, borderCollapse: "separate", tableLayout: "fixed" }}
      >
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((stat, c) => (
                <td
                  key={stat.label}
                  className="ledger-stat"
                  width="33%"
                  valign="top"
                  style={{
                    width: "33.33%",
                    padding: "14px 16px",
                    verticalAlign: "top",
                    borderLeft: c > 0 ? `1px solid ${color.rule}` : undefined,
                    borderTop: r > 0 ? `1px solid ${color.rule}` : undefined,
                  }}
                >
                  <div style={{ fontSize: 12, lineHeight: "16px", fontWeight: 500, color: color.muted }}>
                    {stat.label}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 20,
                      lineHeight: "26px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: color.text,
                    }}
                  >
                    {stat.value}
                  </div>
                  {stat.change && (
                    <div style={{ marginTop: 2, fontSize: 12, lineHeight: "16px", color: color.muted }}>
                      {stat.change}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export interface ShareRow {
  label: string;
  value: string;
  /** 0–100, this row's share of the total. */
  share: number | null;
  /** 0–100, bar length relative to the largest row. */
  bar: number;
}

interface ShareTableProps {
  labelHeader: string;
  valueHeader: string;
  rows: ShareRow[];
  top?: number;
}

/** A ranked breakdown: label, a periwinkle share bar, the count and its share. */
export const ShareTable = ({ labelHeader, valueHeader, rows, top = 12 }: ShareTableProps) => {
  const header = { fontSize: 12, lineHeight: "16px", fontWeight: 500, color: color.muted, paddingBottom: 8 };
  const cell = { padding: "10px 0", borderBottom: `1px solid ${color.ruleSoft}` };
  return (
    <div style={{ marginTop: top }}>
      <table {...table} width="100%" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ ...header, borderBottom: `1px solid ${color.rule}` }}>{labelHeader}</td>
            <td
              className="ledger-bar"
              width="112"
              style={{ ...header, width: 112, borderBottom: `1px solid ${color.rule}` }}
            />
            <td
              width="72"
              align="right"
              style={{ ...header, width: 72, textAlign: "right", borderBottom: `1px solid ${color.rule}` }}
            >
              {valueHeader}
            </td>
            <td
              width="60"
              align="right"
              style={{ ...header, width: 60, textAlign: "right", borderBottom: `1px solid ${color.rule}` }}
            >
              Share
            </td>
          </tr>
          {rows.map(row => (
            <tr key={row.label}>
              <td style={{ ...cell, fontSize: 14, lineHeight: "20px", color: color.text, wordBreak: "break-all" }}>
                {row.label}
              </td>
              <td className="ledger-bar" style={{ ...cell, paddingLeft: 16 }}>
                <table {...table} width="96" style={{ width: 96, borderCollapse: "separate" }}>
                  <tbody>
                    <tr>
                      <td
                        width={`${Math.max(2, Math.round(row.bar))}%`}
                        style={{
                          height: 6,
                          lineHeight: "6px",
                          fontSize: 0,
                          backgroundColor: color.data,
                          borderRadius: 3,
                        }}
                      >
                        &nbsp;
                      </td>
                      {row.bar < 98 && (
                        <td
                          style={{
                            height: 6,
                            lineHeight: "6px",
                            fontSize: 0,
                            backgroundColor: color.track,
                            borderRadius: 3,
                          }}
                        >
                          &nbsp;
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </td>
              <td
                align="right"
                style={{
                  ...cell,
                  textAlign: "right",
                  fontSize: 14,
                  lineHeight: "20px",
                  fontWeight: 500,
                  color: color.text,
                }}
              >
                {row.value}
              </td>
              <td
                align="right"
                style={{ ...cell, textAlign: "right", fontSize: 13, lineHeight: "20px", color: color.muted }}
              >
                {row.share == null ? "" : `${row.share.toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Signoff = () => (
  <P top={28}>
    Bill
    <br />
    <span style={{ color: color.muted }}>Founder, Rybbit</span>
  </P>
);

export { table as tableAttrs };
