import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../../db/clickhouse/clickhouse.js";
import { getTimeStatement, processResults, getFilterStatement } from "../utils.js";
import { FilterParams } from "@rybbit/shared";

export type GetOutboundLinksResponse = {
  url: string;
  count: number;
  lastClicked: string;
}[];

export interface GetOutboundLinksRequest {
  Params: {
    site: string;
  };
  Querystring: FilterParams<{}>;
}

export async function getOutboundLinks(req: FastifyRequest<GetOutboundLinksRequest>, res: FastifyReply) {
  const { startDate, endDate, timeZone, filters, pastMinutesStart, pastMinutesEnd } = req.query;
  const site = req.params.site;

  const timeStatement = getTimeStatement(req.query);
  const filterStatement = filters ? getFilterStatement(filters) : "";

  const query = `
    SELECT
      toString(props) as properties,
      timestamp
    FROM events
    WHERE
      site_id = {siteId:Int32}
      AND type = 'outbound'
      ${timeStatement}
      ${filterStatement}
    ORDER BY timestamp DESC
  `;

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    interface RawOutboundEvent {
      properties: string;
      timestamp: string;
    }

    const rawData = await processResults<RawOutboundEvent>(result);

    const urlCounts = new Map<string, { count: number; lastClicked: string }>();

    rawData.forEach(event => {
      try {
        const props = JSON.parse(event.properties);
        const url = props.url;
        if (url) {
          const existing = urlCounts.get(url);
          if (existing) {
            existing.count++;
            // Keep the most recent timestamp
            if (event.timestamp > existing.lastClicked) {
              existing.lastClicked = event.timestamp;
            }
          } else {
            urlCounts.set(url, { count: 1, lastClicked: event.timestamp });
          }
        }
      } catch (e) {
        // Skip events with invalid JSON
      }
    });

    // Convert to response format
    const data: GetOutboundLinksResponse = Array.from(urlCounts.entries())
      .map(([url, { count, lastClicked }]) => ({ url, count, lastClicked }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    return res.send({ data });
  } catch (error) {
    console.error("Generated Query:", query);
    console.error("Error fetching outbound links:", error);
    return res.status(500).send({ error: "Failed to fetch outbound links" });
  }
}
