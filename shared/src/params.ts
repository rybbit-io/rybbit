export interface BaseParams {
  startDate: string;
  endDate: string;
  timeZone: string;
  filters: string;
  pastMinutesStart?: number;
  pastMinutesEnd?: number;
}

export type FilterParams<T = {}> = BaseParams & T;
