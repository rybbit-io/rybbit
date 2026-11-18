import { createHash } from "node:crypto";
import { DPA_VERSION } from "@rybbit/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ready: vi.fn(() => true),
  insertValues: vi.fn(async (_row: Record<string, unknown>) => undefined),
  renderDpaPdf: vi.fn(async () => Buffer.from("%PDF-test")),
  sendDpaSignedEmail: vi.fn(async () => undefined),
}));

vi.mock("@rybbit/shared", async importOriginal => ({
  ...(await importOriginal<typeof import("@rybbit/shared")>()),
  isDpaCountersignatureReady: mocks.ready,
}));
vi.mock("../../db/postgres/postgres.js", () => ({
  db: { insert: () => ({ values: mocks.insertValues }) },
}));
vi.mock("../../services/dpa/dpaPdf.js", () => ({
  renderDpaPdf: mocks.renderDpaPdf,
  dpaPdfFilename: () => "rybbit-dpa-acme-2026-11-17.pdf",
}));
vi.mock("../../lib/email/email.js", () => ({ sendDpaSignedEmail: mocks.sendDpaSignedEmail }));

import { signDpa, signDpaBodySchema } from "./dpaAgreements.js";

const validBody = {
  dpaVersion: DPA_VERSION,
  companyName: "  Acme\tGmbH ",
  companyAddress: "Musterstraße 12\r\n\r\n\r\n10115   Berlin  ",
  signerName: "Jördis Example",
  signerTitle: "Managing Director",
  signerEmail: "legal@acme.example",
  agreed: true,
};

function fakeReply() {
  const reply = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(body: unknown) {
      reply.body = body;
      return reply;
    },
  };
  return reply;
}

async function sign(
  body: unknown,
  user: Record<string, unknown> | undefined = { id: "user-1", email: "admin@acme.example" }
) {
  const reply = fakeReply();
  const request = {
    params: { organizationId: "org-1" },
    body,
    user,
    ip: "203.0.113.7",
    headers: { "user-agent": "vitest" },
  } as unknown as FastifyRequest<{ Params: { organizationId: string }; Body: unknown }>;
  await signDpa(request, reply as unknown as FastifyReply);
  return reply;
}

describe("signDpaBodySchema", () => {
  it("normalizes whitespace, keeping the address's line breaks", () => {
    const parsed = signDpaBodySchema.parse(validBody);
    expect(parsed.companyName).toBe("Acme GmbH");
    expect(parsed.companyAddress).toBe("Musterstraße 12\n\n10115 Berlin");
  });

  it.each([
    ["no agreement", { agreed: false }],
    ["a blank company", { companyName: "   " }],
    ["a bad email", { signerEmail: "not-an-email" }],
    ["an overlong name", { signerName: "x".repeat(121) }],
  ])("rejects %s", (_label, override) => {
    expect(signDpaBodySchema.safeParse({ ...validBody, ...override }).success).toBe(false);
  });
});

describe("signDpa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ready.mockReturnValue(true);
  });

  it("refuses to sign while Rybbit's countersignature details are placeholders", async () => {
    mocks.ready.mockReturnValue(false);
    const reply = await sign(validBody);
    expect(reply.statusCode).toBe(503);
    expect(mocks.renderDpaPdf).not.toHaveBeenCalled();
  });

  it("refuses a signature on an older version of the text", async () => {
    const reply = await sign({ ...validBody, dpaVersion: "2020-01-01" });
    expect(reply.statusCode).toBe(409);
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("rejects invalid details", async () => {
    const reply = await sign({ ...validBody, agreed: false });
    expect(reply.statusCode).toBe(400);
  });

  it("stores the PDF with its hash and emails it to the signer and the account that signed", async () => {
    const reply = await sign(validBody);

    expect(reply.statusCode).toBe(201);
    expect(reply.body.emailed).toBe(true);
    expect(reply.body.agreement).toMatchObject({ companyName: "Acme GmbH", dpaVersion: DPA_VERSION });

    const row = mocks.insertValues.mock.calls[0][0];
    expect(row).toMatchObject({
      organizationId: "org-1",
      signedByUserId: "user-1",
      signerIp: "203.0.113.7",
      signerUserAgent: "vitest",
      pdfSha256: createHash("sha256").update("%PDF-test").digest("hex"),
    });

    expect(mocks.renderDpaPdf).toHaveBeenCalledWith(expect.objectContaining({ accountEmail: "admin@acme.example" }));
    expect(mocks.sendDpaSignedEmail).toHaveBeenCalledWith(
      ["legal@acme.example", "admin@acme.example"],
      expect.objectContaining({ companyName: "Acme GmbH" }),
      expect.objectContaining({ filename: "rybbit-dpa-acme-2026-11-17.pdf" })
    );
  });

  it("still succeeds when the email fails, so they can download it instead", async () => {
    mocks.sendDpaSignedEmail.mockRejectedValueOnce(new Error("resend down"));
    const reply = await sign(validBody, { id: "user-1", email: "LEGAL@acme.example" });

    expect(reply.statusCode).toBe(201);
    expect(reply.body.emailed).toBe(false);
    expect(mocks.renderDpaPdf).toHaveBeenCalledWith(expect.objectContaining({ accountEmail: null }));
  });

  it("does not store anything when the PDF can't be rendered", async () => {
    mocks.renderDpaPdf.mockRejectedValueOnce(new Error("no chromium"));
    const reply = await sign(validBody);

    expect(reply.statusCode).toBe(500);
    expect(mocks.insertValues).not.toHaveBeenCalled();
    expect(mocks.sendDpaSignedEmail).not.toHaveBeenCalled();
  });
});
