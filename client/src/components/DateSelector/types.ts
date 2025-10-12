export type DateMode = {
  mode: "day";
  day: string;
};

export type DateRangeMode = {
  mode: "range";
  startDate: string;
  endDate: string;
  wellKnown?: "Last 3 days" | "Last 7 days" | "Last 14 days" | "Last 30 days" | "Last 60 days";
};

export type WeekMode = {
  mode: "week";
  week: string;
};

export type MonthMode = {
  mode: "month";
  month: string;
};

export type YearMode = {
  mode: "year";
  year: string;
};

export type AllTimeMode = {
  mode: "all-time";
};

export type PastMinutesMode = {
  mode: "past-minutes";
  pastMinutesStart: number;
  pastMinutesEnd: number;
};

export type Time = DateMode | DateRangeMode | WeekMode | MonthMode | YearMode | AllTimeMode | PastMinutesMode;
