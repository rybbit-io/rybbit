import { createHash, randomUUID } from "node:crypto";
import { DPA_FIELD_LIMITS, DPA_VERSION, isDpaCountersignatureReady, type DpaCustomerDetails } from "@rybbit/shared";
import { and, desc, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { dpaAgreements } from "../../db/postgres/schema.js";
import { sendDpaSignedEmail } from "../../lib/email/email.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { dpaPdfFilename, renderDpaPdf } from "../../services/dpa/dpaPdf.js";

const logger = createServiceLogger("dpa");

type OrgParams = { organizationId: string };

/** Collapses whitespace (newlines included) and drops control characters. */
const singleLine = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Keeps line breaks, at most one blank line in a row, and nothing else invisible. */
const multiLine = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const requiredText = (max: number, normalize: (value: string) => string) =>
  z.string().transform(normalize).pipe(z.string().min(1).max(max));

export const signDpaBodySchema = z.object({
  dpaVersion: z.string(),
  companyName: requiredText(DPA_FIELD_LIMITS.companyName, singleLine),
  companyAddress: requiredText(DPA_FIELD_LIMITS.companyAddress, multiLine),
  signerName: requiredText(DPA_FIELD_LIMITS.signerName, singleLine),
  signerTitle: requiredText(DPA_FIELD_LIMITS.signerTitle, singleLine),
  signerEmail: z.string().trim().max(DPA_FIELD_LIMITS.signerEmail).email(),
  agreed: z.literal(true),
});

/** signed_at is a zoneless timestamp holding UTC; hand it out as an ISO instant. */
const utcIso = (value: string) =>
  new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`).toISOString();

const summaryColumns = {
  id: dpaAgreements.id,
  dpaVersion: dpaAgreements.dpaVersion,
  companyName: dpaAgreements.companyName,
  companyAddress: dpaAgreements.companyAddress,
  signerName: dpaAgreements.signerName,
  signerTitle: dpaAgreements.signerTitle,
  signerEmail: dpaAgreements.signerEmail,
  signedAt: dpaAgreements.signedAt,
};

export async function listDpaAgreements(request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) {
  const { organizationId } = request.params;
  try {
    const agreements = await db
      .select(summaryColumns)
      .from(dpaAgreements)
      .where(eq(dpaAgreements.organizationId, organizationId))
      .orderBy(desc(dpaAgreements.signedAt));

    return reply.send({
      currentVersion: DPA_VERSION,
      signingAvailable: isDpaCountersignatureReady(),
      agreements: agreements.map(agreement => ({ ...agreement, signedAt: utcIso(agreement.signedAt) })),
    });
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to list DPA agreements");
    return reply.status(500).send({ error: "Failed to load DPA agreements" });
  }
}

export async function signDpa(request: FastifyRequest<{ Params: OrgParams; Body: unknown }>, reply: FastifyReply) {
  const { organizationId } = request.params;
  const user = request.user as { id: string; email?: string } | undefined;
  if (!user?.id) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!isDpaCountersignatureReady()) {
    return reply.status(503).send({ error: "DPA signing isn't available yet." });
  }

  const parsed = signDpaBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid DPA details", details: parsed.error.flatten().fieldErrors });
  }
  const { dpaVersion, agreed: _agreed, ...customer } = parsed.data;
  if (dpaVersion !== DPA_VERSION) {
    return reply
      .status(409)
      .send({ error: "The DPA was updated after you opened it. Reload the page and review it before signing." });
  }

  const details: DpaCustomerDetails = customer;
  const agreementId = randomUUID();
  const signedAt = new Date().toISOString();
  const signerIp = request.ip || null;
  const userAgent = request.headers["user-agent"]?.slice(0, 512) ?? null;
  const accountEmail = user.email && user.email.toLowerCase() !== details.signerEmail.toLowerCase() ? user.email : null;

  let pdf: Buffer;
  try {
    pdf = await renderDpaPdf({ agreementId, details, signedAt, signerIp, accountEmail });
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to render DPA PDF");
    return reply.status(500).send({ error: "Couldn't generate the DPA. Please try again." });
  }

  try {
    await db.insert(dpaAgreements).values({
      id: agreementId,
      organizationId,
      dpaVersion,
      ...details,
      signedByUserId: user.id,
      signerIp,
      signerUserAgent: userAgent,
      pdf,
      pdfSha256: createHash("sha256").update(pdf).digest("hex"),
      signedAt,
    });
  } catch (error) {
    logger.error({ error, organizationId }, "Failed to store DPA agreement");
    return reply.status(500).send({ error: "Couldn't save the signed DPA. Please try again." });
  }

  // The agreement is signed and stored; a failed email only means they download it instead.
  let emailed = true;
  try {
    await sendDpaSignedEmail(
      [details.signerEmail, ...(accountEmail ? [accountEmail] : [])],
      {
        agreementId,
        companyName: details.companyName,
        signerName: details.signerName,
        signerTitle: details.signerTitle,
        signedAt,
      },
      { filename: dpaPdfFilename(details.companyName, signedAt), content: pdf }
    );
  } catch (error) {
    emailed = false;
    logger.error({ error, organizationId, agreementId }, "Failed to email signed DPA");
  }

  return reply.status(201).send({
    agreement: { id: agreementId, dpaVersion, ...details, signedAt },
    emailed,
  });
}

export async function downloadDpaPdf(
  request: FastifyRequest<{ Params: OrgParams & { agreementId: string } }>,
  reply: FastifyReply
) {
  const { organizationId, agreementId } = request.params;
  try {
    const [agreement] = await db
      .select({ pdf: dpaAgreements.pdf, companyName: dpaAgreements.companyName, signedAt: dpaAgreements.signedAt })
      .from(dpaAgreements)
      .where(and(eq(dpaAgreements.id, agreementId), eq(dpaAgreements.organizationId, organizationId)))
      .limit(1);

    if (!agreement) {
      return reply.status(404).send({ error: "DPA not found" });
    }

    return reply
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        `attachment; filename="${dpaPdfFilename(agreement.companyName, agreement.signedAt)}"`
      )
      .header("Cache-Control", "private, no-store")
      .send(agreement.pdf);
  } catch (error) {
    logger.error({ error, organizationId, agreementId }, "Failed to download DPA PDF");
    return reply.status(500).send({ error: "Failed to download the DPA" });
  }
}
