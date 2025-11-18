import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { processResults } from "./utils.js";

// Define the expected shape of a single data row from the query
interface RetentionDataRow {
  cohort_period: string;
  period_difference: number;
  cohort_size: number;
  retained_users: number;
  retention_percentage: number;
}

// Processed data structure for the frontend
interface ProcessedRetentionData {
  cohorts: Record<string, { size: number; percentages: (number | null)[] }>;
  maxPeriods: number;
  mode: "day" | "week";
  range: number;
}

export const getRetention = async (
  req: FastifyRequest<{
    Params: { site: string };
    Querystring: { mode?: string; range?: string };
  }>,
  res: FastifyReply
) => {
  const { site } = req.params;
  const { mode = "week", range = "90" } = req.query; // Default to weekly mode and 90 days range

  // Validate mode parameter
  const retentionMode = mode === "day" ? "day" : "week";

  // Validate range parameter (between 7-365 days)
  const timeRange = Math.min(365, Math.max(7, parseInt(range) || 90));

  // Build the appropriate SQL based on the retention mode
  const periodFunction = retentionMode === "day" ? "toDate" : "toStartOfWeek";
  const periodDiffFunc = retentionMode === "day" ? "day" : "week";

  const query = await clickhouse.query({
    query: `
WITH UserFirstPeriod AS (
    SELECT
        user_id,
        ${periodFunction}(min(timestamp)${retentionMode === "week" ? ", 1" : ""}) AS cohort_period
    FROM events
    WHERE site_id = {siteId:UInt16}
    -- Use the configurable time range
    AND timestamp >= addDays(today(), -{timeRange:UInt16})
    GROUP BY user_id
),
PeriodActivity AS (
    SELECT DISTINCT
        user_id,
        ${periodFunction}(timestamp${retentionMode === "week" ? ", 1" : ""}) AS activity_period
    FROM events
    WHERE site_id = {siteId:UInt16}
    -- Match the date range filter
    AND timestamp >= addDays(today(), -{timeRange:UInt16})
),
CohortRetention AS (
    SELECT
        ufp.cohort_period,
        dateDiff('${periodDiffFunc}', ufp.cohort_period, pa.activity_period) AS period_difference,
        count(DISTINCT pa.user_id) AS retained_users
    FROM UserFirstPeriod ufp
    JOIN PeriodActivity pa ON ufp.user_id = pa.user_id
    WHERE pa.activity_period >= ufp.cohort_period
    GROUP BY
        ufp.cohort_period,
        period_difference
),
CohortSize AS (
    SELECT
        cohort_period,
        count(DISTINCT user_id) AS total_users
    FROM UserFirstPeriod
    GROUP BY cohort_period
)
SELECT
    cr.cohort_period,
    cr.period_difference,
    cs.total_users AS cohort_size,
    cr.retained_users,
    round(cr.retained_users * 100.0 / cs.total_users, 2) AS retention_percentage
FROM CohortRetention cr
JOIN CohortSize cs ON cr.cohort_period = cs.cohort_period
ORDER BY
    cr.cohort_period DESC,
    cr.period_difference ASC;
    `,
    format: "JSONEachRow",
    query_params: {
      siteId: Number(site),
      timeRange: timeRange,
    },
  });

  const results = await processResults<RetentionDataRow>(query);

  // Process data into a grid-friendly format
  const processedData: ProcessedRetentionData = {
    ...processRetentionData(results),
    mode: retentionMode as "day" | "week",
    range: timeRange,
  };

  return res.send({ data: processedData });
};

// Process raw retention data into a grid-friendly format
function processRetentionData(rawData: RetentionDataRow[]): Omit<ProcessedRetentionData, "mode" | "range"> {
  if (!rawData || rawData.length === 0) {
    return { cohorts: {}, maxPeriods: 0 };
  }

  const processedCohorts: Record<string, { size: number; percentages: (number | null)[] }> = {};
  let maxPeriodDiff = 0;

  rawData.forEach(row => {
    if (!processedCohorts[row.cohort_period]) {
      processedCohorts[row.cohort_period] = {
        size: row.cohort_size,
        percentages: [],
      };
    }
    // Ensure array is long enough, filling gaps with null
    while (processedCohorts[row.cohort_period].percentages.length <= row.period_difference) {
      processedCohorts[row.cohort_period].percentages.push(null);
    }
    processedCohorts[row.cohort_period].percentages[row.period_difference] = row.retention_percentage;

    if (row.period_difference > maxPeriodDiff) {
      maxPeriodDiff = row.period_difference;
    }
  });

  // Ensure all percentage arrays have the same length for grid alignment
  const finalMaxPeriods = Math.max(maxPeriodDiff, 0);

  Object.values(processedCohorts).forEach(cohort => {
    // Ensure all cohorts have the same number of periods
    while (cohort.percentages.length <= finalMaxPeriods) {
      cohort.percentages.push(null);
    }
  });

  return { cohorts: processedCohorts, maxPeriods: finalMaxPeriods };
}
