import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { pdfReportService } from "../../services/pdfReports/pdfReportService.js";
import { DateTime } from "luxon";

const QuerystringSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  time_zone: z.string(),
  filters: z.string().optional(),
});

interface GeneratePdfReportRequest {
  Params: {
    siteId: string;
  };
  Querystring: z.infer<typeof QuerystringSchema>;
}

export async function generatePdfReport(
  request: FastifyRequest<GeneratePdfReportRequest>,
  reply: FastifyReply
) {
  try {
    const { siteId } = request.params;
    const queryResult = QuerystringSchema.safeParse(request.query);

    if (!queryResult.success) {
      return reply.status(400).send({
        error: "Validation error",
        details: queryResult.error.flatten(),
      });
    }

    const { start_date, end_date, time_zone, filters } = queryResult.data;

    const pdfBuffer = await pdfReportService.generatePdfReport({
      siteId: Number(siteId),
      startDate: start_date,
      endDate: end_date,
      timeZone: time_zone,
      filters: filters ? JSON.parse(filters) : undefined,
    });

    const formattedStart = DateTime.fromISO(start_date).toFormat("yyyy-MM-dd");
    const formattedEnd = DateTime.fromISO(end_date).toFormat("yyyy-MM-dd");
    const filename = `rybbit-report-${siteId}-${formattedStart}-to-${formattedEnd}.pdf`;

    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF report:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return reply.status(404).send({ error: error.message });
    }

    return reply.status(500).send({ error: "Failed to generate PDF report" });
  }
}
