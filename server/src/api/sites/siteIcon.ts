import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";

interface SiteIdParams {
  Params: {
    siteId: string;
  };
}

const MAX_ICON_SIZE = 50 * 1024; // 50KB

export async function getSiteIcon(
  request: FastifyRequest<SiteIdParams>,
  reply: FastifyReply
) {
  const parsedSiteId = Number.parseInt(request.params.siteId, 10);
  if (!Number.isInteger(parsedSiteId) || parsedSiteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    const site = await db.query.sites.findFirst({
      where: eq(sites.siteId, parsedSiteId),
      columns: { icon: true },
    });

    if (!site?.icon) {
      return reply.status(404).send({ error: "No icon found" });
    }

    return reply
      .header("Content-Type", "image/png")
      .header("Cache-Control", "public, max-age=86400")
      .send(Buffer.from(site.icon));
  } catch (error) {
    console.error("Error retrieving site icon:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}

export async function uploadSiteIcon(
  request: FastifyRequest<SiteIdParams & { Body: { icon: string } }>,
  reply: FastifyReply
) {
  const parsedSiteId = Number.parseInt(request.params.siteId, 10);
  if (!Number.isInteger(parsedSiteId) || parsedSiteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  const { icon } = request.body as { icon: string };

  if (!icon) {
    return reply.status(400).send({ error: "icon field is required" });
  }

  try {
    const buffer = Buffer.from(icon, "base64");

    if (buffer.length > MAX_ICON_SIZE) {
      return reply.status(400).send({ error: "Icon exceeds 50KB limit" });
    }

    // Validate PNG magic bytes
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    if (buffer.length < 4 || !buffer.subarray(0, 4).equals(pngMagic)) {
      return reply.status(400).send({ error: "Icon must be a PNG image" });
    }

    const result = await db
      .update(sites)
      .set({ icon: buffer })
      .where(eq(sites.siteId, parsedSiteId))
      .returning({ siteId: sites.siteId });

    if (result.length === 0) {
      return reply.status(404).send({ error: "Site not found" });
    }

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error("Error uploading site icon:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}

export async function deleteSiteIcon(
  request: FastifyRequest<SiteIdParams>,
  reply: FastifyReply
) {
  const parsedSiteId = Number.parseInt(request.params.siteId, 10);
  if (!Number.isInteger(parsedSiteId) || parsedSiteId <= 0) {
    return reply.status(400).send({ error: "Invalid site ID" });
  }

  try {
    const result = await db
      .update(sites)
      .set({ icon: null })
      .where(eq(sites.siteId, parsedSiteId))
      .returning({ siteId: sites.siteId });

    if (result.length === 0) {
      return reply.status(404).send({ error: "Site not found" });
    }

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error("Error deleting site icon:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
}
