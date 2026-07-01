export type DateMode = {
  mode: "day";
  day: string;
  wellKnown?: "today" | "yesterday";
};

export type DateOnlyRangeMode = {
  mode: "range";
  startDate: string;
  endDate: string;
  startTime?: never;
  endTime?: never;
  wellKnown?: "last-3-days" | "last-7-days" | "last-14-days" | "last-30-days" | "last-60-days";
};

export type DateTimeRangeMode = {
  mode: "range";
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  wellKnown?: never;
};

export type DateRangeMode = DateOnlyRangeMode | DateTimeRangeMode;

export type WeekMode = {
  mode: "week";
  week: string;
  wellKnown?: "this-week" | "last-week";
};

export type MonthMode = {
  mode: "month";
  month: string;
  wellKnown?: "this-month" | "last-month";
};

export type YearMode = {
  mode: "year";
  year: string;
  wellKnown?: "this-year";
};

export type AllTimeMode = {
  mode: "all-time";
  wellKnown?: "all-time";
};

export type PastMinutesMode = {
  mode: "past-minutes";
  pastMinutesStart: number;
  pastMinutesEnd: number;
  wellKnown?: "last-30-minutes" | "last-1-hour" | "last-6-hours" | "last-24-hours";
};

export type Time =
  | DateMode
  | DateRangeMode
  | WeekMode
  | MonthMode
  | YearMode
  | AllTimeMode
  | PastMinutesMode;
