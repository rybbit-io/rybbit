import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { sites } from "../../db/postgres/schema.js";
import { IS_CLOUD } from "../../lib/const.js";
import { pdfReportService } from "../../services/pdfReports/pdfReportService.js";
import { getSubscriptionInner } from "../stripe/getSubscription.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { validateFilters } from "./utils/query-validation.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const QuerystringSchema = z.object({
  start_date: z.string().regex(dateRegex, "start_date must be a valid YYYY-MM-DD date"),
  end_date: z.string().regex(dateRegex, "end_date must be a valid YYYY-MM-DD date"),
  time_zone: z.string().min(1, "time_zone is required"),
  filters: z.string().optional(),
});

interface GeneratePdfReportRequest {
  Params: {
    siteId: string;
  };
  Querystring: z.infer<typeof QuerystringSchema>;
}

// PDF export is a paid feature. Mirror the client-side gate (planName !== "free"
// and not the entry AppSumo tiers) so the endpoint can't be called directly to
// bypass it. Self-hosted deployments have no billing and are always allowed.
const PLAN_GATED_APPSUMO_TIERS = ["appsumo-1", "appsumo-2"];

async function isPdfExportAllowed(organizationId: string | null): Promise<boolean> {
  if (!IS_CLOUD) {
    return true;
  }
  if (!organizationId) {
    return false;
  }
  const subscription = await getSubscriptionInner(organizationId);
  const planName = subscription?.planName ?? "free";
  return planName !== "free" && !PLAN_GATED_APPSUMO_TIERS.includes(planName);
}

export async function generatePdfReport(request: FastifyRequest<GeneratePdfReportRequest>, reply: FastifyReply) {
  const queryResult = QuerystringSchema.safeParse(request.query);

  if (!queryResult.success) {
    return reply.status(400).send({
      error: "Validation error",
      details: queryResult.error.flatten(),
    });
  }

  const { start_date, end_date, time_zone, filters } = queryResult.data;
  const siteId = Number(request.params.siteId);

  // Validate filters up front so malformed JSON, unknown parameters, or invalid
  // regex patterns return 400 instead of surfacing as a 500 from deep in the
  // report service. getFilterStatement runs the same validation the service does.
  let parsedFilters: ReturnType<typeof validateFilters> | undefined;
  if (filters) {
    try {
      parsedFilters = validateFilters(filters);
      getFilterStatement(filters, siteId);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Invalid filters",
      });
    }
  }

  try {
    const site = await db.query.sites.findFirst({
      where: eq(sites.siteId, siteId),
      columns: { organizationId: true },
    });

    if (!site) {
      return reply.status(404).send({ error: `Site not found: ${siteId}` });
    }

    if (!(await isPdfExportAllowed(site.organizationId))) {
      return reply.status(403).send({ error: "PDF export requires a paid plan" });
    }

    const pdfBuffer = await pdfReportService.generatePdfReport({
      siteId,
      startDate: start_date,
      endDate: end_date,
      timeZone: time_zone,
      filters: parsedFilters,
    });

    const formattedStart = DateTime.fromISO(start_date).toFormat("yyyy-MM-dd");
    const formattedEnd = DateTime.fromISO(end_date).toFormat("yyyy-MM-dd");
    const filename = `rybbit-report-${siteId}-${formattedStart}-to-${formattedEnd}.pdf`;

    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(pdfBuffer);
  } catch (error) {
    request.log.error({ err: error }, "Error generating PDF report");

    if (error instanceof Error && error.message.includes("not found")) {
      return reply.status(404).send({ error: error.message });
    }

    return reply.status(500).send({ error: "Failed to generate PDF report" });
  }
}
