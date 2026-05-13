import { DateTime } from "luxon";

type PlaygroundFilter = {
  parameter: string;
  operator: string;
  value: string;
};

type CommonQueryParamInput = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  filters: PlaygroundFilter[];
};

const toUtcDateTimeParam = (date: string, time: string, timeZone: string) =>
  DateTime.fromISO(`${date}T${time}`, { zone: timeZone })
    .toUTC()
    .toFormat("yyyy-MM-dd HH:mm:ss");

export const buildCommonQueryParams = ({
  startDate,
  endDate,
  startTime,
  endTime,
  timeZone,
  filters,
}: CommonQueryParamInput): Record<string, any> => {
  const queryParams: Record<string, any> =
    startTime && endTime
      ? {
          start_datetime: toUtcDateTimeParam(startDate, startTime, timeZone),
          end_datetime: toUtcDateTimeParam(endDate, endTime, timeZone),
          time_zone: timeZone,
        }
      : {
          start_date: startDate,
          end_date: endDate,
          time_zone: timeZone,
        };

  const apiFilters = filters
    .filter(f => f.value.trim() !== "")
    .map(f => ({
      parameter: f.parameter,
      type: f.operator,
      value: [f.value],
    }));

  if (apiFilters.length > 0) {
    queryParams.filters = JSON.stringify(apiFilters);
  }

  return queryParams;
};
