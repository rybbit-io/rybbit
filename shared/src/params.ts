export interface BaseParams {
  start_date: string;
  end_date: string;
  time_zone: string;
  filters: string;
  start_datetime?: string;
  end_datetime?: string;
  past_minutes_start?: number;
  past_minutes_end?: number;
}

export type FilterParams<T = {}> = BaseParams & T;
