import { TimeRange } from "./uptimeStore";

export const getHoursFromTimeRange = (timeRange: TimeRange) => {
  switch (timeRange) {
    case "1h":
      return 1;
    case "6h":
      return 6;
    case "12h":
      return 12;
    case "24h":
      return 24;
    case "3d":
      return 72;
    case "7d":
      return 168;
    case "14d":
      return 336;
    case "30d":
      return 720;
    case "60d":
      return 1440;
    case "90d":
      return 2160;
    case "180d":
      return 4320;
    case "365d":
      return 8760;
    default:
      return 24;
  }
};
