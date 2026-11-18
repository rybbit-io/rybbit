import { createHash, randomUUID } from "node:crypto";
import { DPA_FIELD_LIMITS, DPA_VERSION, isDpaCountersignatureReady, type DpaCustomerDetails } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
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

  const filename = dpaPdfFilename(details.companyName, signedAt);
  const pdfSha256 = createHash("sha256").update(pdf).digest("hex");

  // Rybbit keeps no copy in its database. The record is this log line and the
  // archive email; the customer keeps the PDF they download and are emailed.
  logger.info(
    {
      agreementId,
      organizationId,
      userId: user.id,
      dpaVersion,
      companyName: details.companyName,
      signerEmail: details.signerEmail,
      signerIp,
      userAgent,
      pdfSha256,
    },
    "DPA signed"
  );

  const emailProps = {
    agreementId,
    companyName: details.companyName,
    signerName: details.signerName,
    signerTitle: details.signerTitle,
    signedAt,
  };
  const attachment = { filename, content: pdf };
  const archiveEmail = process.env.DPA_ARCHIVE_EMAIL?.trim();
  const [customerEmail, archive] = await Promise.allSettled([
    sendDpaSignedEmail([details.signerEmail, ...(accountEmail ? [accountEmail] : [])], emailProps, attachment),
    archiveEmail ? sendDpaSignedEmail([archiveEmail], emailProps, attachment) : Promise.resolve(),
  ]);
  if (customerEmail.status === "rejected") {
    logger.error({ error: customerEmail.reason, organizationId, agreementId }, "Failed to email signed DPA");
  }
  if (archive.status === "rejected") {
    logger.error({ error: archive.reason, organizationId, agreementId, pdfSha256 }, "Failed to archive signed DPA");
  } else if (!archiveEmail) {
    logger.warn({ organizationId, agreementId }, "DPA_ARCHIVE_EMAIL is not set; Rybbit kept no copy of this DPA");
  }

  // The signature is complete either way: the browser downloads the PDF from this response.
  return reply.send({ filename, pdf: pdf.toString("base64"), emailed: customerEmail.status === "fulfilled" });
}
