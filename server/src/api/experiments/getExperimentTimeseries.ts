import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { z } from "zod";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { buildGoalCondition } from "../analytics/goals/goalConditions.js";
import { processResults } from "../analytics/utils/utils.js";
import {
  buildExperimentResultQueries,
  type ExperimentResultsQuery,
  type ExperimentWindow,
  resolveExperimentWindow,
} from "./getExperimentResults.js";
import { getExperimentVariantKeys, getExperimentWithRelations, parseExperimentId, parseSiteId } from "./utils.js";

type DailyRow = { variant: string; day: string; units: number | string; conversions: number | string };

export type ExperimentTimeseriesPoint = { date: string; units: number; conversions: number; conversionRate: number };

const MAX_DAYS = 366;

function windowDay(value: string | null, timeZone: string): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const instant = DateTime.fromSQL(value, { zone: "utc" });
  return instant.isValid ? instant.setZone(timeZone).toISODate() : null;
}

export function buildCumulativeSeries(
  variants: string[],
  rows: DailyRow[],
  window: ExperimentWindow,
  timeZone: string,
  today = DateTime.now().setZone(timeZone).toISODate()!
): { variant: string; points: ExperimentTimeseriesPoint[] }[] {
  const dataDays = rows.map(row => row.day).sort();
  const first = windowDay(window.start, timeZone) ?? dataDays[0];
  const last = windowDay(window.end, timeZone) ?? (window.mode === "experiment" ? today : dataDays[dataDays.length - 1]);
  if (!first || !last) return variants.map(variant => ({ variant, points: [] }));

  const end = DateTime.fromISO(last < first ? first : last, { zone: "utc" });
  const earliest = end.minus({ days: MAX_DAYS - 1 });
  const start = DateTime.max(DateTime.fromISO(first, { zone: "utc" }), earliest);
  const days: string[] = [];
  for (let cursor = start; cursor <= end; cursor = cursor.plus({ days: 1 })) {
    days.push(cursor.toISODate()!);
  }

  const allVariants = [...variants];
  for (const row of rows) if (!allVariants.includes(row.variant)) allVariants.push(row.variant);

  const daily = new Map(rows.map(row => [`${row.variant}|${row.day}`, row]));

  return allVariants.map(variant => {
    let units = 0;
    let conversions = 0;
    for (const row of rows) {
      if (row.variant !== variant || row.day < first || row.day >= days[0]) continue;
      units += Number(row.units);
      conversions += Number(row.conversions);
    }
    return {
      variant,
      points: days.map(date => {
        const row = daily.get(`${variant}|${date}`);
        units += Number(row?.units ?? 0);
        conversions += Number(row?.conversions ?? 0);
        return { date, units, conversions, conversionRate: units > 0 ? conversions / units : 0 };
      }),
    };
  });
}

export async function getExperimentTimeseries(
  request: FastifyRequest<{
    Params: { siteId: string; experimentId: string };
    Querystring: ExperimentResultsQuery;
  }>,
  reply: FastifyReply
) {
  try {
    const siteId = parseSiteId(request.params.siteId, reply);
    if (!siteId) return;

    const experimentId = parseExperimentId(request.params.experimentId, reply);
    if (!experimentId) return;

    const record = await getExperimentWithRelations(siteId, experimentId);
    if (!record) {
      return reply.status(404).send({ error: "Experiment not found" });
    }

    const variants = getExperimentVariantKeys(record.featureFlag);
    const { query, window } = resolveExperimentWindow(request.query, record.experiment);
    const timeZone = query.time_zone || "UTC";
    const goalCondition = record.primaryGoal ? buildGoalCondition(record.primaryGoal) : null;

    if (!record.primaryGoal || !goalCondition) {
      return reply.send({ data: { variants: [], measurement: "exposure", window } });
    }

    const { exposureTimeseriesQuery, assignmentTimeseriesQuery } = buildExperimentResultQueries({
      query,
      siteId,
      flagKey: record.featureFlag.key,
      goalCondition,
    });

    let measurement: "exposure" | "assignment" = "exposure";
    let rows = await processResults<DailyRow>(
      await clickhouse.query({ query: exposureTimeseriesQuery, format: "JSONEachRow" })
    );
    if (rows.length === 0) {
      const assignmentRows = await processResults<DailyRow>(
        await clickhouse.query({ query: assignmentTimeseriesQuery, format: "JSONEachRow" })
      );
      if (assignmentRows.length > 0) {
        rows = assignmentRows;
        measurement = "assignment";
      }
    }

    return reply.send({
      data: { variants: buildCumulativeSeries(variants, rows, window, timeZone), measurement, window },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: "Validation error", details: error.errors });
    }
    return reply.status(500).send({ error: "Failed to get experiment time series" });
  }
}
