import { DPA_VERSION } from "@rybbit/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  renderDpaPdf: vi.fn(async () => Buffer.from("%PDF-test")),
  sendDpaSignedEmail: vi.fn(async () => undefined),
}));

vi.mock("../../services/dpa/dpaPdf.js", () => ({
  renderDpaPdf: mocks.renderDpaPdf,
  dpaPdfFilename: () => "rybbit-dpa-acme-2026-11-17.pdf",
}));
vi.mock("../../lib/email/email.js", () => ({ sendDpaSignedEmail: mocks.sendDpaSignedEmail }));

import { signDpa, signDpaBodySchema } from "./signDpa.js";

const validBody = {
  dpaVersion: DPA_VERSION,
  companyName: "  Acme GmbH ",
  companyAddress: "Musterstraße 12\n10115 Berlin  ",
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
  it("trims what the customer typed", () => {
    const parsed = signDpaBodySchema.parse(validBody);
    expect(parsed.companyName).toBe("Acme GmbH");
    expect(parsed.companyAddress).toBe("Musterstraße 12\n10115 Berlin");
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
    vi.stubEnv("DPA_ARCHIVE_EMAIL", "dpa-archive@rybbit.example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses a signature on an older version of the text", async () => {
    const reply = await sign({ ...validBody, dpaVersion: "2020-01-01" });
    expect(reply.statusCode).toBe(409);
    expect(mocks.renderDpaPdf).not.toHaveBeenCalled();
  });

  it("rejects invalid details", async () => {
    const reply = await sign({ ...validBody, agreed: false });
    expect(reply.statusCode).toBe(400);
  });

  it("returns the PDF and emails it to the signer, the signing account, and the archive", async () => {
    const reply = await sign(validBody);

    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      filename: "rybbit-dpa-acme-2026-11-17.pdf",
      pdf: Buffer.from("%PDF-test").toString("base64"),
      emailed: true,
    });

    expect(mocks.renderDpaPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({ companyName: "Acme GmbH" }),
        signerIp: "203.0.113.7",
        accountEmail: "admin@acme.example",
      })
    );
    expect(mocks.sendDpaSignedEmail).toHaveBeenCalledWith(
      ["legal@acme.example", "admin@acme.example", "dpa-archive@rybbit.example"],
      expect.objectContaining({ companyName: "Acme GmbH" }),
      expect.objectContaining({ filename: "rybbit-dpa-acme-2026-11-17.pdf" })
    );
  });

  it("skips the archive copy when no archive address is set", async () => {
    vi.stubEnv("DPA_ARCHIVE_EMAIL", "");
    const reply = await sign(validBody);

    expect(reply.statusCode).toBe(200);
    expect(mocks.sendDpaSignedEmail).toHaveBeenCalledWith(
      ["legal@acme.example", "admin@acme.example"],
      expect.anything(),
      expect.anything()
    );
  });

  it("still returns the PDF when the email fails", async () => {
    mocks.sendDpaSignedEmail.mockRejectedValueOnce(new Error("resend down"));
    const reply = await sign(validBody, { id: "user-1", email: "LEGAL@acme.example" });

    expect(reply.statusCode).toBe(200);
    expect(reply.body.emailed).toBe(false);
    expect(reply.body.pdf).toBeTruthy();
    expect(mocks.renderDpaPdf).toHaveBeenCalledWith(expect.objectContaining({ accountEmail: null }));
  });

  it("sends nothing when the PDF can't be rendered", async () => {
    mocks.renderDpaPdf.mockRejectedValueOnce(new Error("no chromium"));
    const reply = await sign(validBody);

    expect(reply.statusCode).toBe(500);
    expect(mocks.sendDpaSignedEmail).not.toHaveBeenCalled();
  });
});
