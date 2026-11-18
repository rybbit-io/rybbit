import { createHash, randomUUID } from "node:crypto";
import { DPA_FIELD_LIMITS, DPA_VERSION, type DpaCustomerDetails } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { sendDpaSignedEmail } from "../../lib/email/email.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { dpaPdfFilename, renderDpaPdf } from "../../services/dpa/dpaPdf.js";

const logger = createServiceLogger("dpa");

type OrgParams = { organizationId: string };

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const signDpaBodySchema = z.object({
  dpaVersion: z.string(),
  companyName: requiredText(DPA_FIELD_LIMITS.companyName),
  companyAddress: requiredText(DPA_FIELD_LIMITS.companyAddress),
  signerName: requiredText(DPA_FIELD_LIMITS.signerName),
  signerTitle: requiredText(DPA_FIELD_LIMITS.signerTitle),
  signerEmail: z.string().trim().max(DPA_FIELD_LIMITS.signerEmail).email(),
  agreed: z.literal(true),
});

export async function signDpa(request: FastifyRequest<{ Params: OrgParams; Body: unknown }>, reply: FastifyReply) {
  const { organizationId } = request.params;
  const user = request.user as { id: string; email?: string } | undefined;
  if (!user?.id) {
    return reply.status(401).send({ error: "Unauthorized" });
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

  // Archive copy last, so a failure there can't stop the customer's emails.
  const archiveEmail = process.env.DPA_ARCHIVE_EMAIL?.trim();
  let emailed = true;
  try {
    await sendDpaSignedEmail(
      [details.signerEmail, ...(accountEmail ? [accountEmail] : []), ...(archiveEmail ? [archiveEmail] : [])],
      {
        agreementId,
        companyName: details.companyName,
        signerName: details.signerName,
        signerTitle: details.signerTitle,
        signedAt,
      },
      { filename, content: pdf }
    );
  } catch (error) {
    emailed = false;
    logger.error({ error, organizationId, agreementId, pdfSha256 }, "Failed to email signed DPA");
  }

  // The signature is complete either way: the browser downloads the PDF from this response.
  return reply.send({ filename, pdf: pdf.toString("base64"), emailed });
}
