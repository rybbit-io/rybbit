"use client";

import { ChartColumnDecreasing } from "lucide-react";
import { DateTime } from "luxon"; // Import Luxon for date formatting
import { Fragment, useMemo, useState } from "react";
import { useGetRetention } from "../../../api/analytics/hooks/useGetRetention";
import { RetentionMode } from "../../../api/analytics/endpoints";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { ThreeDotLoader } from "../../../components/Loaders";
import { NothingFound } from "../../../components/NothingFound";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { MobileSidebar } from "../components/Sidebar/MobileSidebar";
import { RetentionChart } from "./RetentionChart";
import { ErrorState } from "../../../components/ErrorState";

// Available time range options (in days)
const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last 1 year" },
];

// Dynamic color function that creates a smooth gradient based on retention percentage
const getRetentionColor = (
  percentage: number | null,
  isDark: boolean
): { backgroundColor: string; textColor: string } => {
  if (percentage === null || isNaN(percentage)) {
    return {
      backgroundColor: isDark ? "rgb(38, 38, 38)" : "rgb(250, 250, 250)", // bg-neutral-800 : bg-neutral-50
      textColor: "transparent",
    };
  }

  if (percentage === 0) {
    return {
      backgroundColor: isDark ? "rgb(38, 38, 38)" : "rgb(250, 250, 250)", // bg-neutral-800 : bg-neutral-50
      textColor: isDark ? "white" : "rgb(64, 64, 64)",
    };
  }

  // The base emerald-500 color in RGB
  const emerald = "rgb(16, 185, 129)"; // emerald-500

  // Calculate both linear and logarithmic scales
  const linearScale = percentage / 100;
  const logScale = Math.log(percentage + 1) / Math.log(101);

  // Blend between logarithmic and linear (60% log, 40% linear)
  // This creates a less extreme logarithmic effect
  const blendedScale = logScale * 0.6 + linearScale * 0.4;

  // Scale the blended value to get appropriate opacity (min 0.1, max 1.0)
  const scaledOpacity = 0.1 + blendedScale * 0.9;

  // Use the scaled opacity for the background color
  return {
    backgroundColor: `rgba(16, 185, 129, ${scaledOpacity.toFixed(2)})`,
    textColor: isDark ? "white" : "black",
  };
};

export default function RetentionPage() {
  useSetPageTitle("Rybbit · Retention");

  // State for the retention mode (day or week)
  const [mode, setMode] = useState<RetentionMode>("week");
  // State for the data time range (days)
  const [timeRange, setTimeRange] = useState<number>(30);

  // Check if dark mode is active
  const [isDark, setIsDark] = useState(true);

  // Detect theme on client side
  if (typeof window !== "undefined") {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      if (isDarkMode !== isDark) {
        setIsDark(isDarkMode);
      }
    };
    checkTheme();
  }

  // Use the updated hook without the limit parameter
  const { data, isLoading, isError } = useGetRetention(mode, timeRange);

  // Get sorted cohort keys (oldest first)
  const cohortKeys = useMemo(
    () => (data?.cohorts ? Object.keys(data.cohorts).sort((a, b) => a.localeCompare(b)) : []),
    [data?.cohorts]
  );

  // Function to format date based on mode
  const formatDate = (dateStr: string) => {
    const startDate = DateTime.fromISO(dateStr);
    if (mode === "day") {
      return startDate.toFormat("MMM dd, yyyy");
    } else {
      // For weekly mode, show start and end dates of the week
      const endDate = startDate.plus({ days: 6 }); // End of week (7 days total)

      // If same month, don't repeat month name
      if (startDate.month === endDate.month) {
        return `${startDate.toFormat("MMM dd")} - ${endDate.toFormat("dd, yyyy")}`;
      } else if (startDate.year === endDate.year) {
        // Different months, same year
        return `${startDate.toFormat("MMM dd")} - ${endDate.toFormat("MMM dd, yyyy")}`;
      } else {
        // Different years
        return `${startDate.toFormat("MMM dd, yyyy")} - ${endDate.toFormat("MMM dd, yyyy")}`;
      }
    }
  };

  // Labels for column headers based on mode
  const getPeriodLabel = (index: number) => {
    return mode === "day" ? `Day ${index}` : `Week ${index}`;
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as RetentionMode);
  };

  const handleRangeChange = (value: string) => {
    setTimeRange(parseInt(value));
  };

  // Common filters for both views
  const FilterControls = () => (
    <div className="flex justify-between items-center">
      <div>
        <MobileSidebar />
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <div className="flex items-center gap-2">
          <Select value={timeRange.toString()} onValueChange={handleRangeChange} disabled={isLoading}>
            <SelectTrigger id="time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList>
            <TabsTrigger value="day" disabled={isLoading}>
              Daily
            </TabsTrigger>
            <TabsTrigger value="week" disabled={isLoading}>
              Weekly
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  // Render error state
  if (isError) {
    return (
      <div className="pt-4">
        <Card>
          <CardContent>
            <ErrorState
              title="Failed to load retention data"
              message="There was a problem fetching the retention data. Please try again later."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render empty state
  if (data && (!data.cohorts || cohortKeys.length === 0)) {
    return (
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto flex flex-col gap-3">
        <NothingFound
          icon={<ChartColumnDecreasing className="w-10 h-10" />}
          title={"No retention data available"}
          description={"Try selecting a different time range or make sure you have tracking data in the system."}
        />
      </div>
    );
  }

  const periodHeaders =
    !isLoading && data ? Array.from({ length: data.maxPeriods + 1 }, (_, i) => getPeriodLabel(i)) : [];

  return (
    <DisabledOverlay message="Retention" featurePath="retention">
      <div className="p-2 md:p-4 max-w-[1300px] mx-auto flex flex-col gap-3">
        {/* Single Card containing both chart and grid */}
        <FilterControls />
        <Card className="overflow-visible">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 overflow-visible">
            {isLoading ? (
              <ThreeDotLoader />
            ) : data ? (
              <RetentionChart data={data} isLoading={false} mode={mode} />
            ) : null}
          </CardContent>
        </Card>
        <Card className="pt-3">
          <CardContent className="space-y-6 px-2">
            <div>
              {isLoading ? (
                <ThreeDotLoader />
              ) : data ? (
                <div className="overflow-x-auto">
                  <div
                    className="inline-grid gap-px bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                    style={{
                      gridTemplateColumns: `minmax(120px, auto) repeat(${data.maxPeriods + 1}, minmax(80px, auto))`,
                    }}
                  >
                    {/* Header Row */}
                    <div className="p-2 text-sm font-semibold bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-100 text-center sticky left-0 z-10 border-b border-r border-neutral-50 dark:border-neutral-700">
                      Cohort
                    </div>
                    {periodHeaders.map(header => (
                      <div
                        key={header}
                        className="p-2 text-sm bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-100 text-center border-b border-neutral-50 dark:border-neutral-700"
                      >
                        {header}
                      </div>
                    ))}

                    {/* Data Rows */}
                    {cohortKeys.map(cohortPeriod => (
                      <Fragment key={cohortPeriod}>
                        {/* Cohort Info Cell */}
                        <div className="py-2 px-2 bg-white dark:bg-neutral-900 text-sm sticky left-0 z-10 border-r border-neutral-50 dark:border-neutral-800">
                          <div className="whitespace-nowrap text-neutral-700 dark:text-neutral-100">
                            {formatDate(cohortPeriod)}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-300 mt-1 whitespace-nowrap">
                            {data.cohorts[cohortPeriod].size.toLocaleString()} users
                          </div>
                        </div>
                        {/* Retention Cells */}
                        {data.cohorts[cohortPeriod].percentages.map((percentage: number | null, index: number) => {
                          const { backgroundColor, textColor } = getRetentionColor(percentage, isDark);
                          return (
                            <div
                              key={`${cohortPeriod}-period-${index}`}
                              className="m-[2px] text-center flex items-center justify-center font-medium transition-colors duration-150 bg-white dark:bg-neutral-900 rounded-md"
                              style={{
                                backgroundColor,
                                color: textColor,
                              }}
                            >
                              {percentage !== null ? `${percentage.toFixed(1)}%` : "-"}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </DisabledOverlay>
  );
}
