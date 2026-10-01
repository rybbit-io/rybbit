import { FilterParams } from "@rybbit/shared";
import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/postgres/postgres.js";
import { funnels as funnelsTable } from "../../../db/postgres/schema.js";
import { analyticsRoute, runAnalyticsQuery } from "../utils/analyticsQuery.js";
import { buildFilteredSessionsCTE } from "../utils/sessionFilters.js";
import { getTimeStatement } from "../utils/timeWindow.js";
import { buildFunnelStepCondition, FunnelStep } from "./funnelSteps.js";

/**
 * How many saved funnels one summary covers. The query is one scan whatever the
 * count, but every extra funnel adds aggregates to it, so the list is capped
 * (oldest first, the order the funnels page lists them in) and the response
 * says when funnels were left out.
 */
export const MAX_SUMMARY_FUNNELS = 50;

export interface SummaryFunnel {
  id: number;
  steps: FunnelStep[];
}

export interface FunnelSummary {
  funnel_id: number;
  steps: {
    /** Sessions that reached this step. Funnels are session-scoped, not person-scoped. */
    sessions: number;
    /** Median time from reaching this step to reaching the next. Null on the last step and when nobody continued. */
    median_seconds_to_next: number | null;
  }[];
  /** Median time from the first step to the last, over sessions that reached the last. */
  median_seconds_to_convert: number | null;
}

export interface FunnelSummariesResponse {
  /** Distinct sessions that reached the first step of at least one summarised funnel. */
  sessions_entered_any: number;
  funnels: FunnelSummary[];
  /** True when the site has more saved funnels than one summary covers. */
  truncated: boolean;
}

// Saved steps come out of a jsonb column, so they are checked before they are
// turned into SQL. Unknown step types are kept: the condition builder matches
// them as custom events, as it does for the analyze endpoint.
const propertyValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const savedStepSchema = z.object({
  value: z.string(),
  type: z.string(),
  name: z.string().optional(),
  hostname: z.string().optional(),
  eventPropertyKey: z.string().optional(),
  eventPropertyValue: propertyValueSchema.optional(),
  propertyFilters: z.array(z.object({ key: z.string(), value: propertyValueSchema })).optional(),
});
const savedStepsSchema = z.array(savedStepSchema).min(2);

/** The saved funnels a summary can be computed for: at least two well-formed steps. */
export function parseSavedFunnels(records: { reportId: number; data: unknown }[]): SummaryFunnel[] {
  const funnels: SummaryFunnel[] = [];
  for (const record of records) {
    const steps = savedStepsSchema.safeParse((record.data as { steps?: unknown } | null)?.steps);
    if (steps.success) funnels.push({ id: record.reportId, steps: steps.data as FunnelStep[] });
  }
  return funnels;
}

const EVENT_MS = "toUnixTimestamp64Milli(timestamp_ms)";

/**
 * One scan for every saved funnel of a site.
 *
 * The analyze endpoint walks a funnel with a chain of CTEs: step N is the first
 * event matching its condition strictly after the session reached step N-1.
 * This query answers the same question per session in a single GROUP BY: the
 * first step is the earliest matching event, and each later step is the
 * earliest of its matching events after the step before it (0 when the session
 * never got there). Counting those per funnel gives the same step counts as
 * analyze, and the step times give the medians between steps.
 *
 * Step conditions shared by several funnels (or repeated inside one) are
 * collected once, and the scan is narrowed to events that match at least one
 * of them.
 */
export const buildFunnelSummaryQuery = (query: FilterParams<{}>, siteId: number, funnels: SummaryFunnel[]): string => {
  const timeStatement = getTimeStatement(query);
  const filteredSessionsCTE = buildFilteredSessionsCTE(query.filters, siteId, timeStatement);

  const conditions: string[] = [];
  const conditionIndex = (step: FunnelStep) => {
    const condition = buildFunnelStepCondition(step);
    const existing = conditions.indexOf(condition);
    return existing === -1 ? conditions.push(condition) - 1 : existing;
  };

  // The earliest match is all a first step needs; later steps need every match.
  const firstStepConditions = new Set<number>();
  const laterStepConditions = new Set<number>();
  const funnelConditions = funnels.map(funnel =>
    funnel.steps.map((step, stepIndex) => {
      const index = conditionIndex(step);
      (stepIndex === 0 ? firstStepConditions : laterStepConditions).add(index);
      return index;
    })
  );

  const sessionAggregates = conditions.flatMap((condition, index) => [
    ...(firstStepConditions.has(index) ? [`minIf(${EVENT_MS}, ${condition}) AS first_${index}`] : []),
    ...(laterStepConditions.has(index) ? [`groupArrayIf(${EVENT_MS}, ${condition}) AS all_${index}`] : []),
  ]);

  // f{funnel}_t{step}: when the session reached the step, in epoch ms; 0 if it did not.
  const stepTimes = funnelConditions.flatMap((stepConditions, funnel) =>
    stepConditions.map((condition, step) => {
      const time = `f${funnel}_t${step}`;
      if (step === 0) return `first_${condition} AS ${time}`;
      const previous = `f${funnel}_t${step - 1}`;
      return `if(${previous} = 0, 0, arrayMin(arrayFilter(x -> x > ${previous}, all_${condition}))) AS ${time}`;
    })
  );

  const totals = funnelConditions.flatMap((stepConditions, funnel) => {
    const lastStep = stepConditions.length - 1;
    return [
      ...stepConditions.map((_, step) => `countIf(f${funnel}_t${step} > 0) AS f${funnel}_sessions${step}`),
      ...stepConditions
        .slice(1)
        .map(
          (_, step) =>
            `quantileIf(0.5)(f${funnel}_t${step + 1} - f${funnel}_t${step}, f${funnel}_t${step + 1} > 0) AS f${funnel}_median${step}`
        ),
      `quantileIf(0.5)(f${funnel}_t${lastStep} - f${funnel}_t0, f${funnel}_t${lastStep} > 0) AS f${funnel}_median_total`,
    ];
  });

  return `
    WITH
    ${filteredSessionsCTE ? `${filteredSessionsCTE},` : ""}
    -- One row per session: when each step condition matched
    SessionSteps AS (
      SELECT
        session_id,
        ${sessionAggregates.join(",\n        ")}
      FROM events
      ${filteredSessionsCTE ? "INNER JOIN FilteredSessions USING (session_id)" : ""}
      WHERE
        site_id = {siteId:Int32}
        ${timeStatement}
        AND (${conditions.map(condition => `(${condition})`).join("\n          OR ")})
      GROUP BY session_id
    ),
    -- Walk each funnel in order within the session
    SessionFunnels AS (
      SELECT
        ${stepTimes.join(",\n        ")}
      FROM SessionSteps
    )
    SELECT
      ${totals.join(",\n      ")},
      countIf(${funnels.map((_, funnel) => `f${funnel}_t0 > 0`).join(" OR ")}) AS sessions_entered_any
    FROM SessionFunnels
    `;
};

const toCount = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

// An empty median is NaN in ClickHouse, which JSON carries as null.
const toSeconds = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) / 1000 : null;

/** Reads the query's single wide row back into one summary per funnel. */
export function readFunnelSummaries(
  row: Record<string, unknown> | undefined,
  funnels: SummaryFunnel[]
): FunnelSummary[] {
  return funnels.map((funnel, index) => ({
    funnel_id: funnel.id,
    steps: funnel.steps.map((_, step) => ({
      sessions: toCount(row?.[`f${index}_sessions${step}`]),
      median_seconds_to_next: step < funnel.steps.length - 1 ? toSeconds(row?.[`f${index}_median${step}`]) : null,
    })),
    median_seconds_to_convert: toSeconds(row?.[`f${index}_median_total`]),
  }));
}

export interface GetFunnelSummariesRequest {
  Params: {
    siteId: string;
  };
  Querystring: FilterParams<{}>;
}

/**
 * Step counts and step-to-step medians for the saved funnels of a site over the
 * requested window. The funnels page calls it once for the selected period and
 * once for the comparison period.
 */
export const getFunnelSummaries = analyticsRoute<GetFunnelSummariesRequest>(
  "funnel summaries",
  async (req: FastifyRequest<GetFunnelSummariesRequest>, res: FastifyReply) => {
    const siteId = Number(req.params.siteId);

    const records = await db
      .select({ reportId: funnelsTable.reportId, data: funnelsTable.data })
      .from(funnelsTable)
      .where(eq(funnelsTable.siteId, siteId))
      .orderBy(funnelsTable.createdAt)
      .limit(MAX_SUMMARY_FUNNELS + 1);

    const truncated = records.length > MAX_SUMMARY_FUNNELS;
    const funnels = parseSavedFunnels(records.slice(0, MAX_SUMMARY_FUNNELS));

    if (funnels.length === 0) {
      const empty: FunnelSummariesResponse = { sessions_entered_any: 0, funnels: [], truncated };
      return res.send({ data: empty });
    }

    const rows = await runAnalyticsQuery<Record<string, unknown>>({
      query: buildFunnelSummaryQuery(req.query, siteId, funnels),
      params: { siteId },
    });

    const data: FunnelSummariesResponse = {
      sessions_entered_any: toCount(rows[0]?.sessions_entered_any),
      funnels: readFunnelSummaries(rows[0], funnels),
      truncated,
    };
    return res.send({ data });
  }
);
