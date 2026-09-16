import { DateTime } from "luxon";

export type ClickHouseDateTimeInput = DateTime | Date | number | string;

/**
 * Serialises an instant for a ClickHouse `DateTime` / `DateTime64` column.
 *
 * ClickHouse reads a timezone-less `YYYY-MM-DD hh:mm:ss` string in the
 * column's timezone, and a bare `DateTime` column takes whatever timezone the
 * server is configured with. Rybbit's query layer assumes every stored value
 * is a UTC instant, so on a self-hosted server set to Europe/Berlin a naive
 * string landed two hours off. Every table Rybbit creates now declares its
 * time columns as `'UTC'`, but writers still never send a naive string: an
 * explicit `Z` pins the instant whatever the server or column timezone is.
 *
 * ClickHouse only accepts the ISO offset under
 * `date_time_input_format=best_effort`, which the write client sets globally.
 * A `DateTime` column truncates the milliseconds; `DateTime64(3)` keeps them.
 *
 * Accepts a Luxon DateTime, a JS Date, epoch milliseconds, an ISO-8601 string
 * (with or without an offset — none means UTC), or a ClickHouse-style
 * `YYYY-MM-DD hh:mm:ss` string, which is read as UTC. Throws on anything else
 * rather than let ClickHouse reject the whole batch with a parse error.
 */
export function toClickHouseDateTime(input: ClickHouseDateTimeInput): string {
  const instant = toInstant(input);
  if (!instant.isValid) {
    throw new RangeError(`Cannot serialise ${JSON.stringify(input)} as a ClickHouse DateTime`);
  }
  return instant.toUTC().toISO() as string;
}

function toInstant(input: ClickHouseDateTimeInput): DateTime {
  if (DateTime.isDateTime(input)) return input;
  if (input instanceof Date) return DateTime.fromJSDate(input);
  if (typeof input === "number") return DateTime.fromMillis(input);

  const iso = DateTime.fromISO(input, { zone: "utc", setZone: true });
  if (iso.isValid) return iso;
  return DateTime.fromSQL(input, { zone: "utc" });
}
